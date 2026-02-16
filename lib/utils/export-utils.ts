import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { format } from "date-fns"
import { formatCurrency } from "./currency"
import type { Sale } from "@/lib/db/schema"

// PDF-safe currency formatter — jsPDF default font doesn't support ₵ (renders as µ)
function formatCurrencyPDF(amount: number | string): string {
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount)
    if (isNaN(num)) return "GHS 0.00"
    return `GHS ${num.toFixed(2)}`
}

interface ExportData {
    filteredSales: Sale[]
    dateRange: string
    totalRevenue: number
    totalTransactions: number
    averageTransaction: number
    totalDiscount: number
    totalTax: number
    topProducts: { name: string; quantity: number; revenue: number }[]
    paymentMethodData: { name: string; value: number; count: number }[]
}

export const exportToPDF = (data: ExportData) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Title
    doc.setFontSize(20)
    doc.setTextColor(139, 92, 246) // Purple
    doc.text("Sales Analytics Report", pageWidth / 2, 20, { align: "center" })

    // Subtitle
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text(`Period: ${data.dateRange}`, pageWidth / 2, 28, { align: "center" })
    doc.text(`Generated: ${format(new Date(), "PPpp")}`, pageWidth / 2, 34, { align: "center" })

    let yPosition = 45

    // Summary Statistics
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text("Summary Statistics", 14, yPosition)
    yPosition += 5

    autoTable(doc, {
        startY: yPosition,
        head: [["Metric", "Value"]],
        body: [
            ["Total Revenue", formatCurrencyPDF(data.totalRevenue)],
            ["Total Transactions", data.totalTransactions.toString()],
            ["Average Transaction", formatCurrencyPDF(data.averageTransaction)],
            ["Total Discount", formatCurrencyPDF(data.totalDiscount)],
            ["Total Tax", formatCurrencyPDF(data.totalTax)],
        ],
        theme: "grid",
        headStyles: { fillColor: [139, 92, 246] },
        margin: { left: 14, right: 14 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10

    // Sales Transactions
    if (data.filteredSales.length > 0) {
        doc.setFontSize(14)
        doc.text("Sales Transactions", 14, yPosition)
        yPosition += 5

        const salesData = data.filteredSales.slice(0, 50).map((sale) => [
            format(new Date(sale.createdAt), "yyyy-MM-dd HH:mm"),
            sale.id.toString(),
            formatCurrencyPDF(sale.subtotal),
            formatCurrencyPDF(sale.discountAmount),
            formatCurrencyPDF(sale.taxAmount),
            formatCurrencyPDF(sale.total),
            sale.paymentMethod,
        ])

        autoTable(doc, {
            startY: yPosition,
            head: [["Date", "ID", "Subtotal", "Discount", "Tax", "Total", "Payment"]],
            body: salesData,
            theme: "striped",
            headStyles: { fillColor: [59, 130, 246] },
            margin: { left: 14, right: 14 },
            styles: { fontSize: 8 },
        })

        yPosition = (doc as any).lastAutoTable.finalY + 10
    }

    // Top Products
    if (data.topProducts.length > 0) {
        // Add new page if needed
        if (yPosition > 250) {
            doc.addPage()
            yPosition = 20
        }

        doc.setFontSize(14)
        doc.text("Top Selling Products", 14, yPosition)
        yPosition += 5

        const productsData = data.topProducts.map((product) => [
            product.name,
            product.quantity.toString(),
            formatCurrencyPDF(product.revenue),
        ])

        autoTable(doc, {
            startY: yPosition,
            head: [["Product", "Quantity Sold", "Revenue"]],
            body: productsData,
            theme: "grid",
            headStyles: { fillColor: [16, 185, 129] },
            margin: { left: 14, right: 14 },
        })

        yPosition = (doc as any).lastAutoTable.finalY + 10
    }

    // Payment Methods
    if (data.paymentMethodData.length > 0) {
        // Add new page if needed
        if (yPosition > 250) {
            doc.addPage()
            yPosition = 20
        }

        doc.setFontSize(14)
        doc.text("Payment Methods Breakdown", 14, yPosition)
        yPosition += 5

        const paymentData = data.paymentMethodData.map((method) => [
            method.name,
            method.count.toString(),
            formatCurrencyPDF(method.value),
            `${((method.value / data.totalRevenue) * 100).toFixed(1)}%`,
        ])

        autoTable(doc, {
            startY: yPosition,
            head: [["Payment Method", "Transactions", "Total Amount", "% of Revenue"]],
            body: paymentData,
            theme: "grid",
            headStyles: { fillColor: [236, 72, 153] },
            margin: { left: 14, right: 14 },
        })
    }

    // Save the PDF
    doc.save(`sales-report-${format(new Date(), "yyyy-MM-dd")}.pdf`)
}

export const exportToExcel = (data: ExportData) => {
    const workbook = XLSX.utils.book_new()

    // Summary Sheet
    const summaryData = [
        ["Sales Analytics Report"],
        [`Period: ${data.dateRange}`],
        [`Generated: ${format(new Date(), "PPpp")}`],
        [],
        ["Metric", "Value"],
        ["Total Revenue", data.totalRevenue],
        ["Total Transactions", data.totalTransactions],
        ["Average Transaction", data.averageTransaction],
        ["Total Discount", data.totalDiscount],
        ["Total Tax", data.totalTax],
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    summarySheet["!cols"] = [{ wch: 25 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")

    // Sales Sheet
    const salesData = [
        ["Date", "Sale ID", "Customer ID", "Subtotal", "Discount", "Tax", "Total", "Payment Method"],
        ...data.filteredSales.map((sale) => [
            format(new Date(sale.createdAt), "yyyy-MM-dd HH:mm:ss"),
            sale.id,
            sale.customerId || "Walk-in",
            sale.subtotal,
            sale.discountAmount,
            sale.taxAmount,
            sale.total,
            sale.paymentMethod,
        ]),
    ]
    const salesSheet = XLSX.utils.aoa_to_sheet(salesData)
    salesSheet["!cols"] = [
        { wch: 20 },
        { wch: 10 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
    ]
    XLSX.utils.book_append_sheet(workbook, salesSheet, "Sales")

    // Top Products Sheet
    if (data.topProducts.length > 0) {
        const productsData = [
            ["Product Name", "Quantity Sold", "Revenue"],
            ...data.topProducts.map((product) => [product.name, product.quantity, product.revenue]),
        ]
        const productsSheet = XLSX.utils.aoa_to_sheet(productsData)
        productsSheet["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }]
        XLSX.utils.book_append_sheet(workbook, productsSheet, "Top Products")
    }

    // Payment Methods Sheet
    if (data.paymentMethodData.length > 0) {
        const paymentData = [
            ["Payment Method", "Transaction Count", "Total Amount", "% of Revenue"],
            ...data.paymentMethodData.map((method) => [
                method.name,
                method.count,
                method.value,
                ((method.value / data.totalRevenue) * 100).toFixed(2) + "%",
            ]),
        ]
        const paymentSheet = XLSX.utils.aoa_to_sheet(paymentData)
        paymentSheet["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 15 }]
        XLSX.utils.book_append_sheet(workbook, paymentSheet, "Payment Methods")
    }

    // Write the file
    XLSX.writeFile(workbook, `sales-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`)
}
