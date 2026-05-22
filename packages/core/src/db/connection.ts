import mongoose from 'mongoose';

let connected = false;

export async function connect(uri: string): Promise<void> {
  if (connected) return;
  await mongoose.connect(uri, { writeConcern: { w: 'majority' } });
  connected = true;
}

export async function disconnect(): Promise<void> {
  await mongoose.disconnect();
  connected = false;
}
