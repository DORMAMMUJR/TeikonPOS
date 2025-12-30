import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { PendingSale } from '../types';

interface TeikonDB extends DBSchema {
    pendingSales: {
        key: string;
        value: PendingSale;
        indexes: { 'by-date': string };
    };
}

let db: IDBPDatabase<TeikonDB> | null = null;

// Initialize IndexedDB
export const initDB = async (): Promise<IDBPDatabase<TeikonDB>> => {
    if (db) return db;

    db = await openDB<TeikonDB>('teikon-pos', 1, {
        upgrade(db) {
            const salesStore = db.createObjectStore('pendingSales', {
                keyPath: 'tempId'
            });
            salesStore.createIndex('by-date', 'createdAt');
        }
    });

    return db;
};

// Add pending sale to queue
export const addPendingSale = async (sale: PendingSale): Promise<void> => {
    const database = await initDB();
    await database.add('pendingSales', sale);
};

// Get all pending sales
export const getPendingSales = async (): Promise<PendingSale[]> => {
    const database = await initDB();
    return await database.getAll('pendingSales');
};

// Remove pending sale after successful sync
export const removePendingSale = async (tempId: string): Promise<void> => {
    const database = await initDB();
    await database.delete('pendingSales', tempId);
};

// Clear all pending sales
export const clearPendingSales = async (): Promise<void> => {
    const database = await initDB();
    await database.clear('pendingSales');
};

// Get count of pending sales
export const getPendingSalesCount = async (): Promise<number> => {
    const database = await initDB();
    return await database.count('pendingSales');
};
