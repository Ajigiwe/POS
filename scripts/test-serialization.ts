
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Fetching products...')
        const products = await prisma.product.findMany({
            include: {
                category: true // Include category details if needed
            },
            orderBy: {
                name: 'asc'
            }
        })

        console.log('Fetching complete. Count:', products.length)

        const serializedProducts = products.map(product => ({
            ...product,
            costPrice: Number(product.costPrice),
            sellingPrice: Number(product.sellingPrice)
        }))

        console.log('Serializing to JSON...')
        const json = JSON.stringify(serializedProducts)
        console.log('Serialization successful. Length:', json.length)

    } catch (e) {
        console.error('ERROR:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
