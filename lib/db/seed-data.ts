
export const defaultCategories = [
    {
        name: "Electronics",
        description: "Electronic devices and accessories",
        color: "#3B82F6",
    },
    {
        name: "Clothing",
        description: "Apparel and fashion items",
        color: "#8B5CF6",
    },
    {
        name: "Food",
        description: "Food and beverage items",
        color: "#10B981",
    },
    {
        name: "Home Goods",
        description: "Home and household items",
        color: "#06B6D4",
    },
    {
        name: "Books",
        description: "Books and educational materials",
        color: "#F59E0B",
    },
]

export const sampleProducts = [
    // Electronics
    {
        name: "Wireless Mouse",
        sku: "ELEC-001",
        barcode: "1234567890001",
        categoryName: "Electronics",
        costPrice: 15.0,
        sellingPrice: 29.99,
        quantity: 50,
        lowStockThreshold: 10,
        supplier: "Tech Supplies Inc",
    },
    {
        name: "USB-C Cable",
        sku: "ELEC-002",
        barcode: "1234567890002",
        categoryName: "Electronics",
        costPrice: 5.0,
        sellingPrice: 12.99,
        quantity: 100,
        lowStockThreshold: 20,
        supplier: "Tech Supplies Inc",
    },
    {
        name: "Bluetooth Headphones",
        sku: "ELEC-003",
        barcode: "1234567890003",
        categoryName: "Electronics",
        costPrice: 35.0,
        sellingPrice: 69.99,
        quantity: 30,
        lowStockThreshold: 8,
        supplier: "Tech Supplies Inc",
    },

    // Clothing
    {
        name: "Cotton T-Shirt",
        sku: "CLTH-001",
        barcode: "1234567890011",
        categoryName: "Clothing",
        costPrice: 8.0,
        sellingPrice: 19.99,
        quantity: 45,
        lowStockThreshold: 10,
        supplier: "Fashion Wholesale",
    },
    {
        name: "Denim Jeans",
        sku: "CLTH-002",
        barcode: "1234567890012",
        categoryName: "Clothing",
        costPrice: 25.0,
        sellingPrice: 59.99,
        quantity: 30,
        lowStockThreshold: 8,
        supplier: "Fashion Wholesale",
    },
    {
        name: "Hoodie",
        sku: "CLTH-003",
        barcode: "1234567890013",
        categoryName: "Clothing",
        costPrice: 20.0,
        sellingPrice: 49.99,
        quantity: 35,
        lowStockThreshold: 8,
        supplier: "Fashion Wholesale",
    },

    // Food
    {
        name: "Organic Coffee Beans 500g",
        sku: "FOOD-001",
        barcode: "1234567890021",
        categoryName: "Food",
        costPrice: 8.0,
        sellingPrice: 18.99,
        quantity: 55,
        lowStockThreshold: 12,
        supplier: "Fresh Foods Ltd",
    },
    {
        name: "Green Tea (20 bags)",
        sku: "FOOD-002",
        barcode: "1234567890022",
        categoryName: "Food",
        costPrice: 3.0,
        sellingPrice: 7.99,
        quantity: 70,
        lowStockThreshold: 15,
        supplier: "Fresh Foods Ltd",
    },
    {
        name: "Dark Chocolate Bar",
        sku: "FOOD-003",
        barcode: "1234567890023",
        categoryName: "Food",
        costPrice: 2.5,
        sellingPrice: 5.99,
        quantity: 90,
        lowStockThreshold: 20,
        supplier: "Fresh Foods Ltd",
    },

    // Home Goods
    {
        name: "Coffee Mug",
        sku: "HOME-001",
        barcode: "1234567890031",
        categoryName: "Home Goods",
        costPrice: 4.0,
        sellingPrice: 9.99,
        quantity: 40,
        lowStockThreshold: 8,
        supplier: "Home Goods Co",
    },
    {
        name: "Dinner Plate Set (4pc)",
        sku: "HOME-002",
        barcode: "1234567890032",
        categoryName: "Home Goods",
        costPrice: 18.0,
        sellingPrice: 39.99,
        quantity: 25,
        lowStockThreshold: 6,
        supplier: "Home Goods Co",
    },
    {
        name: "Throw Pillow",
        sku: "HOME-003",
        barcode: "1234567890033",
        categoryName: "Home Goods",
        costPrice: 10.0,
        sellingPrice: 24.99,
        quantity: 35,
        lowStockThreshold: 8,
        supplier: "Home Goods Co",
    },

    // Books
    {
        name: "The Great Novel",
        sku: "BOOK-001",
        barcode: "1234567890041",
        categoryName: "Books",
        costPrice: 10.0,
        sellingPrice: 24.99,
        quantity: 30,
        lowStockThreshold: 6,
        supplier: "Book Distributors",
    },
    {
        name: "Cookbook: Easy Meals",
        sku: "BOOK-002",
        barcode: "1234567890042",
        categoryName: "Books",
        costPrice: 12.0,
        sellingPrice: 29.99,
        quantity: 25,
        lowStockThreshold: 5,
        supplier: "Book Distributors",
    },
    {
        name: "Self-Help Guide",
        sku: "BOOK-003",
        barcode: "1234567890043",
        categoryName: "Books",
        costPrice: 8.0,
        sellingPrice: 19.99,
        quantity: 35,
        lowStockThreshold: 8,
        supplier: "Book Distributors",
    },
]

export const sampleCustomers = [
    {
        name: "John Smith",
        phone: "+1234567890",
        email: "john.smith@email.com",
        loyaltyPoints: 150,
    },
    {
        name: "Sarah Johnson",
        phone: "+1234567891",
        email: "sarah.j@email.com",
        loyaltyPoints: 200,
    },
    {
        name: "Mike Davis",
        phone: "+1234567892",
        loyaltyPoints: 50,
    },
]

export type SaleSeed = {
    subtotal: number
    discountAmount: number
    taxAmount: number
    total: number
    paymentMethod: string
    status: string
    createdAt: Date
    items: {
        productName: string
        quantity: number
        unitPrice: number
        subtotal: number
        productSKU: string // used to look up ID
    }[]
}

export function generateSalesData(products: typeof sampleProducts): SaleSeed[] {
    const sales: SaleSeed[] = []
    const paymentMethods = ["cash", "card", "mobile_money"]
    const now = new Date()

    // Generate 7 sales days (down from 30)
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const salesPerDay = Math.floor(Math.random() * 2) + 1 // 1-2 sales per day

        for (let saleNum = 0; saleNum < salesPerDay; saleNum++) {
            const itemCount = Math.floor(Math.random() * 3) + 1 // 1-3 items
            const items = []
            let subtotal = 0

            const usedIndices = new Set<number>()
            for (let i = 0; i < itemCount; i++) {
                let index
                do {
                    index = Math.floor(Math.random() * products.length)
                } while (usedIndices.has(index))
                usedIndices.add(index)

                const product = products[index]
                const quantity = Math.floor(Math.random() * 2) + 1
                const itemSubtotal = product.sellingPrice * quantity
                subtotal += itemSubtotal

                items.push({
                    productName: product.name,
                    productSKU: product.sku,
                    quantity,
                    unitPrice: product.sellingPrice,
                    subtotal: itemSubtotal
                })
            }

            const discountAmount = Math.random() > 0.8 ? Math.floor(Math.random() * 5) + 1 : 0
            const taxAmount = parseFloat(((subtotal - discountAmount) * 0.1).toFixed(2))
            const total = parseFloat((subtotal - discountAmount + taxAmount).toFixed(2))

            const hoursOffset = dayOffset * 24 + Math.floor(Math.random() * 24)
            const createdAt = new Date(now.getTime() - 1000 * 60 * 60 * hoursOffset)

            sales.push({
                subtotal: parseFloat(subtotal.toFixed(2)),
                discountAmount,
                taxAmount,
                total,
                paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                status: "completed",
                createdAt,
                items
            })
        }
    }
    return sales
}
