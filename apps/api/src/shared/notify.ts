import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { notifications } from '../db/schema/index.js';
import type { Server } from 'socket.io';

let io: Server | null = null;

export function setSocketServer(server: Server) {
  io = server;
}

export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  body: string,
): Promise<void> {
  const [notif] = await db
    .insert(notifications)
    .values({ userId, type, title, body })
    .returning();

  io?.to(`user:${userId}`).emit('notification', notif);
}

export function emitToRoom(room: string, event: string, data: unknown): void {
  io?.to(room).emit(event, data);
}

export function emitWarUpdate(warId: string, data: unknown): void {
  io?.to(`war:${warId}`).emit('war:update', data);
}
