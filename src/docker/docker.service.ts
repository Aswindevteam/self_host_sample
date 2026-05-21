import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import Dockerode from 'dockerode';
import { IContainerInfo } from './interfaces/container-info.interface';
import { ContainerState } from './enums/container-state.enum';
import { ProjectsService } from '../projects/projects.service';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class DockerService {
  private docker: Dockerode;

  constructor(
    private projectsService: ProjectsService,
  ) {
    this.docker = new Dockerode({ socketPath: '/var/run/docker.sock' });
  }

  async checkContainerAccess(id: string, user: any): Promise<void> {
    if (user.role === UserRole.ADMIN) {
      return;
    }
    try {
      const container = this.docker.getContainer(id);
      const info = await container.inspect();
      const name = info.Name; // e.g. "/app-6a0da748..."
      if (name.startsWith('/app-')) {
        const projectId = name.substring(5);
        // projectsService.findOne will throw UnauthorizedException if project doesn't belong to user's org
        await this.projectsService.findOne(projectId, user);
      } else {
        throw new UnauthorizedException('Access denied to system container');
      }
    } catch (err) {
      throw new UnauthorizedException(`Access denied: ${err.message}`);
    }
  }

  async listContainers(user: any): Promise<IContainerInfo[]> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      const userProjects = await this.projectsService.findAll(user);
      const allowedContainerNames = userProjects.map((p) => `/app-${p._id.toString()}`);

      const mapped: IContainerInfo[] = containers
        .map((c) => {
          const appName = c.Names.find((name) => name.startsWith('/app-'));
          let projectName: string | undefined;
          let deploymentId: string | undefined;

          if (appName) {
            const projectId = appName.substring(5);
            const project = userProjects.find((p) => p._id.toString() === projectId);
            if (project) {
              projectName = project.name;
            }
          }

          // Check if image is app-<projectId>:<deploymentId>
          const imageParts = c.Image.split(':');
          const imageRepo = imageParts[0] || '';
          if (imageRepo.startsWith('app-')) {
            const projectId = imageRepo.substring(4);
            const project = userProjects.find((p) => p._id.toString() === projectId);
            if (project) {
              deploymentId = imageParts[1] || '';
            }
          }

          return {
            id: c.Id,
            names: c.Names,
            image: c.Image,
            state: c.State as ContainerState,
            status: c.Status,
            ports: c.Ports,
            projectName,
            deploymentId,
          };
        })
        .filter((c) => {
          // Protect core/system containers from being stopped or deleted
          const name = c.names[0] || '';
          return !['/mongodb_service', '/nest_app', '/wonderful_matsumoto'].includes(name);
        });

      // Only show containers that belong to active LaunchPad projects
      return mapped.filter((c) => {
        const name = c.names[0] || '';
        return allowedContainerNames.includes(name);
      });
    } catch (err) {
      throw new InternalServerErrorException(`Failed to query Docker daemon: ${err.message}`);
    }
  }

  async startContainer(id: string, user: any): Promise<{ message: string }> {
    await this.checkContainerAccess(id, user);
    try {
      const container = this.docker.getContainer(id);
      await container.start();
      return { message: `Container ${id.substring(0, 12)} started successfully` };
    } catch (err) {
      throw new InternalServerErrorException(`Failed to start container: ${err.message}`);
    }
  }

  async stopContainer(id: string, user: any): Promise<{ message: string }> {
    await this.checkContainerAccess(id, user);
    try {
      const container = this.docker.getContainer(id);
      await container.stop();
      return { message: `Container ${id.substring(0, 12)} stopped successfully` };
    } catch (err) {
      throw new InternalServerErrorException(`Failed to stop container: ${err.message}`);
    }
  }

  async restartContainer(id: string, user: any): Promise<{ message: string }> {
    await this.checkContainerAccess(id, user);
    try {
      const container = this.docker.getContainer(id);
      await container.restart();
      return { message: `Container ${id.substring(0, 12)} restarted successfully` };
    } catch (err) {
      throw new InternalServerErrorException(`Failed to restart container: ${err.message}`);
    }
  }

  async getContainerLogs(id: string, user: any, tailCount = 200): Promise<string> {
    await this.checkContainerAccess(id, user);
    try {
      const container = this.docker.getContainer(id);
      const logBuffer = await container.logs({
        stdout: true,
        stderr: true,
        tail: tailCount,
        follow: false,
      });
      return this.cleanDockerLogs(logBuffer);
    } catch (err) {
      throw new InternalServerErrorException(`Failed to retrieve container logs: ${err.message}`);
    }
  }

  private cleanDockerLogs(buffer: Buffer): string {
    let offset = 0;
    let cleanText = '';
    while (offset < buffer.length) {
      const size = buffer.readUInt32BE(offset + 4);
      const chunk = buffer.subarray(offset + 8, offset + 8 + size);
      cleanText += chunk.toString('utf8');
      offset += 8 + size;
    }
    return cleanText || buffer.toString('utf8');
  }
}
