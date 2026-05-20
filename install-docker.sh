#!/usr/bin/env bash
set -e

echo "=== 1. Removing old Docker versions (if any) ==="
sudo apt-get remove -y docker docker-engine docker.io containerd runc || true

echo "=== 2. Installing prerequisites ==="
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

echo "=== 3. Setting up Docker repository keys ==="
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "=== 4. Setting up Docker stable repository ==="
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "=== 5. Installing Docker Engine & Docker Compose ==="
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "=== 6. Configuring Docker to run without sudo ==="
# Create docker group if it doesn't exist
sudo groupadd docker || true
# Add current user to docker group
sudo usermod -aG docker $USER

echo "=== Installation complete ==="
echo "Note: To apply the group changes, please log out and log back in, or run:"
echo "  newgrp docker"
echo "to activate the changes in the current terminal session."
