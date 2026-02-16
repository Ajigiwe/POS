import { clearAllDataExceptUsers, seedDatabase } from "./clear-data"

export async function resetDatabaseWithDummyData(): Promise<void> {
    try {
        // 1. Clear specific tables (keeping users and settings to maintain session)
        await clearAllDataExceptUsers()

        // 2. Seed with dummy data
        await seedDatabase()

    } catch (error) {
        console.error("Error resetting database:", error)
        throw error
    }
}
