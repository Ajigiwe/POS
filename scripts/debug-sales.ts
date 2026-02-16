
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Testing connection...')
        const count = await prisma.sale.count()
        console.log('Sale count:', count)

        console.log('Fetching sales...')
        const sales = await prisma.sale.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: true,
                items: true
            }
        })
        console.log('Fetched sales:', JSON.stringify(sales, null, 2))
    } catch (e) {
        console.error('ERROR:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
