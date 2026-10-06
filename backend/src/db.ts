import { PrismaClient } from "@prisma/client";
    
    // Global single instance of PrismaClient
    export const prisma = new PrismaClient();