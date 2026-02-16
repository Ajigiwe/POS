
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Fetching products...')
        const products = await prisma.product.findMany({
            include: {
                category: true
            },
            orderBy: {
                name: 'asc'
            }
        })
        console.log('Fetched products count:', products.length)
        if (products.length > 0) {
            const p = products[0]
            console.log('First product costPrice type:', typeof p.costPrice)
            // console.log('Is Decimal?', p.costPrice instanceof Decimal) 
            console.log('Construction:', p.costPrice.constructor.name)
            console.log('Value:', p.costPrice)
        }
    } catch (e) {
        console.error('ERROR:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
