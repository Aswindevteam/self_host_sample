import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import Dockerode from 'dockerode';
import { IContainerInfo } from './interfaces/container-info.interface';
import { ContainerState } from './enums/container-state.enum';

@Injectable()
export class DockerService {
  private docker: Dockerode;

  constructor() {
    this.docker = new Dockerode({ socketPath: '/var/run/docker.sock' });
  }

  async listContainers(): Promise<IContainerInfo[]> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      return containers
        .map((c) => ({
          id: c.Id,
          names: c.Names,
          image: c.Image,
          state: c.State as ContainerState,
          status: c.Status,
          ports: c.Ports,
        }))
        .filter((c) => {
          // Protect core/system containers from being stopped or deleted
          const name = c.names[0] || '';
          return !['/mongodb_service', '/nest_app', '/wonderful_matsumoto'].includes(name);
        });
    } catch (err) {
      throw new InternalServerErrorException(`Failed to query Docker daemon: ${err.message}`);
    }
  }

  async startContainer(id: string): Promise<{ message: string }> {
    try {
      const container = this.docker.getContainer(id);
      await container.start();
      return { message: `Container ${id.substring(0, 12)} started successfully` };
    } catch (err) {
      throw new InternalServerErrorException(`Failed to start container: ${err.message}`);
    }
  }

  async stopContainer(id: string): Promise<{ message: string }> {
    try {
      const container = this.docker.getContainer(id);
      await container.stop();
      return { message: `Container ${id.substring(0, 12)} stopped successfully` };
    } catch (err) {
      throw new InternalServerErrorException(`Failed to stop container: ${err.message}`);
    }
  }

  async restartContainer(id: string): Promise<{ message: string }> {
    try {
      const container = this.docker.getContainer(id);
      await container.restart();
      return { message: `Container ${id.substring(0, 12)} restarted successfully` };
    } catch (err) {
      throw new InternalServerErrorException(`Failed to restart container: ${err.message}`);
    }
  }

  async getContainerLogs(id: string, tailCount = 200): Promise<string> {
    try {
      const container = this.docker.getContainer(id);
      const logBuffer = await container.logs({
        stdout: true,
        stderr: true,
        tail: tailCount,
        follow: false,
      });
      // Dockerode logs returns a buffer that might contain frame headers (8 bytes each).
      // We can convert the buffer to a clean UTF-8 string.
      return this.cleanDockerLogs(logBuffer);
    } catch (err) {
      throw new InternalServerErrorException(`Failed to retrieve container logs: ${err.message}`);
    }
  }

  // Docker demuxes logs with 8-byte headers. This helper strips them.
  private cleanDockerLogs(buffer: Buffer): string {
    let offset = 0;
    let cleanText = '';
    while (offset < buffer.length) {
      // Header details: 1 byte stream type, 3 bytes padding, 4 bytes size
      const size = buffer.readUInt32BE(offset + 4);
      const chunk = buffer.subarray(offset + 8, offset + 8 + size);
      cleanText += chunk.toString('utf8');
      offset += 8 + size;
    }
    // Fallback in case logs are plain text/undemuxed (e.g. from attach)
    return cleanText || buffer.toString('utf8');
  }
}
