const express = require("express");

import { Network, Disk, Task, CloudClient } from "./cloud";
import { Request, Response } from "express";

interface BatchItems {
  items: any[];
  nextToken: number;
}

const app = express();
const port = 8081;

const client = new CloudClient();

const GC_INTERVAL = 10000;
const MAX_TASKS = 100;
const ERROR_500_MSG =
  "The server encountered an unexpected condition that prevented it from fulfilling the request";

async function fetchAllItems(itemType: string) {
  try {
    let allItems: Network[] | Disk[] | Task[] = [];
    let currentBatch: BatchItems = { items: [], nextToken: 0 };

    // Fetch tasks items there are no more pages
    while (true) {
      switch (itemType) {
        case "networks":
          currentBatch = await client.listNetworks(currentBatch.nextToken);
          break;
        case "disks":
          currentBatch = await client.listDisks(currentBatch.nextToken);
          break;
        case "tasks":
          currentBatch = await client.listTasks(currentBatch.nextToken);
          break;
        default:
          // Nothing
          break;
      }
      // No results have returned. Reached the end of the store for specific item.
      if (!currentBatch.items.length) {
        break;
      }
      allItems.push(...currentBatch.items);
    }
    return allItems;
  } catch (error) {
    console.log("Error retreiving items:", error);
    // Empty for error. Don't want to send half baked results.
    return [];
  }
}

async function GarbageCollector() {
  try {
    const allTasks = (await fetchAllItems("tasks")) as Task[];

    const usedDiskIds = allTasks.map((task) => task.diskId);
    const usedNetworkIds = allTasks.map((task) => task.networkId);

    const allDisks = (await fetchAllItems("disks")) as Disk[];
    const allNetworks = (await fetchAllItems("networks")) as Network[];

    // Destroy unused disks
    allDisks.forEach(async (disk) => {
      if (!usedDiskIds.includes(disk.id)) {
        await client.destroyDisk(disk.id);
      }
    });

    // Destroy unused networks
    allNetworks.forEach(async (network) => {
      if (!usedNetworkIds.includes(network.id)) {
        await client.destroyNetwork(network.id);
      }
    });
  } catch (error) {
    console.log("Error during garbage collection", error);
  }
}

app.post("/task", async (req: Request, res: Response) => {
  const diskSize = req.query.diskSize;
  if (!diskSize) {
    return res.status(400).send("Query param 'diskSize' is required");
  }
  try {
    const allTasks = (await fetchAllItems("tasks")) as Task[];
    if (allTasks.length >= MAX_TASKS) {
      return res
        .status(429)
        .send("Too many tasks created, cannot create any more.");
    }

    const createdDiskId = await client.createDisk({
      byteSize: Number(diskSize),
    });

    const createdNetworkId = await client.createNetwork();

    const createdTaskId: string = await client.createTask({
      dockerImage: "ubuntu:latest",
      networkId: createdNetworkId,
      diskId: createdDiskId,
    });

    res.status(200).send({ taskId: `${createdTaskId}` });
  } catch (error) {
    console.log("Error during task creation:", error);
    return res.status(500).send(ERROR_500_MSG);
  }
});

app.get("/tasks", async (req: Request, res: Response) => {
  try {
    const allTasks = (await fetchAllItems("tasks")) as Task[];
    res.status(200).send(allTasks);
  } catch (error) {
    console.log("Error retreiving tasks:", error);
    res.status(500).send(ERROR_500_MSG);
  }
});

app.get("/disks", async (req: Request, res: Response) => {
  try {
    const allTasks = (await fetchAllItems("disks")) as Disk[];
    res.status(200).send(allTasks);
  } catch (error) {
    console.log("Error retreiving disks:", error);
    res.status(500).send(ERROR_500_MSG);
  }
});

app.get("/networks", async (req: Request, res: Response) => {
  try {
    const allTasks = (await fetchAllItems("networks")) as Network[];
    res.status(200).send(allTasks);
  } catch (error) {
    console.log("Error retreiving networks:", error);
    res.status(500).send(ERROR_500_MSG);
  }
});

app.delete("/task", async (req: Request, res: Response) => {
  const taskId = req.query.id;
  if (!taskId) {
    res.status(400).send("Query param 'id' is required");
  }
  try {
    await client.destroyTask(String(taskId));
    res.status(200).send("Task deleted successfully");
  } catch (error) {
    console.log(`Error while trying to destroy task with Id ${taskId}`, error);
    res.status(500).send(`Failed to delete task with Id ${taskId}`);
  }
});

app.listen(port, () => {
  console.log(`Toy app listening on port ${port}`);
});

setInterval(GarbageCollector, GC_INTERVAL);
