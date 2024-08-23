import { randomUUID } from "crypto";

export interface Network {
    id: string;
}

export interface Disk {
    id: string;
    byteSize: number;
}

export interface Task {
    id: string;
    networkId: string;
    diskId: string;
    dockerImage: string;
}

export class CloudClient {
    private networks: Network[] = [];
    private disks: Disk[] = [];
    private tasks: Task[] = [];

    async listTasks(nextToken?: number): Promise<{ items: Task[], nextToken: number }> {
        return await this.listResource(this.tasks, nextToken);
    }

    async createTask(params: Omit<Task, 'id'>): Promise<string> {
        if (this.networks.findIndex(x => x.id === params.networkId) === -1) {
            throw new Error('Unkown network');
        }

        if (this.disks.findIndex(x => x.id === params.diskId) === -1) {
            throw new Error('Unkown disk');
        }

        return await this.createResource(this.tasks, params);
    }

    async destroyTask(id: string): Promise<void> {
        await this.destroyResource(this.tasks, id);
    }

    async listNetworks(nextToken?: number): Promise<{ items: Network[], nextToken: number }> {
        return await this.listResource(this.networks, nextToken);
    }

    async createNetwork(): Promise<string> {
        return await this.createResource(this.networks, {});
    }

    async destroyNetwork(id: string): Promise<void> {
        this.simulateFailure();
        await this.destroyResource(this.networks, id);
    }

    async listDisks(nextToken?: number): Promise<{ items: Disk[], nextToken: number }> {
        return await this.listResource(this.disks, nextToken);
    }

    async createDisk(params: { byteSize: number }): Promise<string> {
        return await this.createResource(this.disks, params);
    }

    async destroyDisk(id: string): Promise<void> {
        await this.destroyResource(this.disks, id);
    }

    private async listResource<T>(store: T[], nextToken?: number): Promise<{ items: T[], nextToken: number }> {
        this.simulateFailure();

        const start = nextToken ?? 0;
        const end = start + 10;

        return {
            items: store.slice(start, end),
            nextToken: end
        };
    }

    private async createResource<T extends { id: string }>(store: T[], params: Omit<T, 'id'>): Promise<string> {
        this.simulateFailure();

        const id = randomUUID();

        store.push({ ...params, id } as T);

        return id;
    }

    private async destroyResource<T extends { id: string }>(store: T[], id: string): Promise<void> {
        this.simulateFailure();

        const index = store.findIndex(x => x.id === id);
        if (index === -1) {
            throw new Error('Resource not found');
        }

        store.splice(index, 1);
    }

    private simulateFailure() {
        if (Math.random() < 0.001) {
            throw new Error('Error performing cloud operation');
        }
    }
}
