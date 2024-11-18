import { Injectable } from '@angular/core';
import { CompanyInfoService } from '../company-info/company-info.service';
import { Timestamp } from '@angular/fire/firestore';
import * as pdfMake from 'pdfmake/build/pdfmake.js';
import * as pdfFonts from 'pdfmake/build/vfs_fonts.js';

(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;
import { TDocumentDefinitions, PageOrientation } from 'pdfmake/interfaces';

import { Products } from 'src/app/models/products';
import { Transactions } from 'src/app/models/transaction/transactions';
import { formatPrice } from 'src/app/utils/constants';
import { Users } from 'src/app/models/users';

@Injectable({
  providedIn: 'root',
})
export class PdfExportService {
  static getAvailabilityStatus(product: Products): any {
    throw new Error('Method not implemented.');
  }
  constructor(private companyInfoService: CompanyInfoService) {}

  async exportProductsToPdf(products: Products[]): Promise<void> {
    const companyInfo = this.companyInfoService;
    const currentDate = new Date();
    const logoImagePath = 'assets/images/logo.png';
    const logoImageDataURL = await this.getImageDataUrl(logoImagePath);

    const transformedData = products.map((product) => ({
      name: product.name,
      category: product.category,
      price: product.price,
      quantity: product.stocks,
      expiryDate: product.expiryDate.toLocaleDateString(),
      availability: this.getAvailabilityStatus(product),
    }));

    const documentDefinition: TDocumentDefinitions = {
      pageOrientation: 'landscape' as PageOrientation,
      content: [
        // Your PDF content here based on transformedData
        // Content for the Left Column
        {
          columns: [
            // Left Column
            {
              width: 'auto',
              stack: [
                { text: companyInfo.getCompanyName(), bold: true },
                companyInfo.getCompanyAddress(),
                companyInfo.getCompanyEmail(),
                companyInfo.getCompanyTelephone(),
                '\n',
                { text: `Exported by:` },
                { text: `Printed At: ${currentDate.toLocaleString()}` },
                '\n',
              ],
            },
            // Right Column (Logo)
            {
              width: '*', // Take the remaining space
              stack: [
                {
                  image: logoImageDataURL,
                  width: 75,
                  absolutePosition: { x: 700, y: 20 },
                },
              ],
            },
          ],
        },

        {
          table: {
            headerRows: 1,
            widths: ['*', 80, 50, 80, 80, 150],
            body: [
              [
                'Product',
                'Category',
                'Price',
                'Quantity',
                'Expiry Date',
                'Availability',
              ],
              ...transformedData.map((item) => [
                item.name,
                item.category,
                item.price,
                item.quantity,
                item.expiryDate,
                item.availability,
              ]),
            ],
          },
        },
      ],
    };

    pdfMake.createPdf(documentDefinition).download('products-report.pdf');
  }

  private async getImageDataUrl(imagePath: string): Promise<string> {
    const response = await fetch(imagePath);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private getAvailabilityStatus(product: Products): string {
    const stockCount =
      product.variations.length === 0
        ? product.stocks
        : product.variations.reduce(
            (acc, variation) => acc + variation.stocks,
            0
          );

    if (stockCount >= 20) {
      return 'In Stock';
    } else if (stockCount > 0) {
      return 'Low in Stock';
    } else {
      return 'Out of Stock';
    }
  }

  async exportTransaction(
    transactions: Transactions,
    users: Users | null
  ): Promise<void> {
    const companyInfo = this.companyInfoService;
    const currentDate = new Date();
    const logoImagePath = 'assets/images/logo.png';
    const logoImageDataURL = await this.getImageDataUrl(logoImagePath);

    const transformedData = transactions.orderList.map((e) => ({
      id: e.isVariation ? e.variationID : e.productID,
      name: e.productName,
      quantity: e.quantity,
      price: e.price,
    }));

    const documentDefinition: TDocumentDefinitions = {
      pageOrientation: 'landscape' as PageOrientation,
      content: [
        // Your PDF content here based on transformedData
        // Content for the Left Column
        {
          columns: [
            // Left Column
            {
              width: 'auto',
              stack: [
                { text: companyInfo.getCompanyName(), bold: true },
                companyInfo.getCompanyAddress(),
                companyInfo.getCompanyEmail(),
                companyInfo.getCompanyTelephone(),
                '\n',
                { text: `Invoice ID: ${transactions.id}` },
                { text: `Cashier: ${users?.name ?? 'No cashier'}` },
                { text: `Type: ${transactions.type}` },
                { text: `Status: ${transactions.status}` },
                { text: `Transaction Date: ${currentDate.toLocaleString()}` },

                { text: `TOTAL : ${formatPrice(transactions.payment.amount)}` },
                '\n',
              ],
            },
            // Right Column (Logo)
            {
              width: '*', // Take the remaining space
              stack: [
                {
                  image: logoImageDataURL,
                  width: 75,
                  absolutePosition: { x: 700, y: 20 },
                },
              ],
            },
          ],
        },

        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*', '*'],
            body: [
              ['ID', 'NAME', 'QUANTITY', 'PRICE'],
              ...transformedData.map((item) => [
                item.id,
                item.name,
                item.quantity,
                formatPrice(item.price),
              ]),
            ],
          },
        },
      ],
    };

    pdfMake.createPdf(documentDefinition).open();
  }
}
