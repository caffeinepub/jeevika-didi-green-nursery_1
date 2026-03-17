import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
}
export interface Bill {
    id: bigint;
    customerName: string;
    total: number;
    prsName: string;
    billDate: string;
    panchayat: string;
    timestamp: bigint;
    paymentDate: string;
    block: string;
    mobile: string;
    itemsJson: string;
    billNo: string;
    workCode: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addBill(block: string, panchayat: string, customerName: string, billNo: string, billDate: string, workCode: string, paymentDate: string, prsName: string, mobile: string, itemsJson: string, total: number): Promise<{
        id: bigint;
    }>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteBill(id: bigint): Promise<void>;
    getAllBills(): Promise<Array<Bill>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateBill(id: bigint, block: string, panchayat: string, customerName: string, billNo: string, billDate: string, workCode: string, paymentDate: string, prsName: string, mobile: string, itemsJson: string, total: number, timestamp: bigint): Promise<{
        id: bigint;
    }>;
}
