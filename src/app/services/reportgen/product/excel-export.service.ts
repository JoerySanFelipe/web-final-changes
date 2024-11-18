import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { CompanyInfoService } from '../company-info/company-info.service';
import { Products } from 'src/app/models/products';

@Injectable({
  providedIn: 'root',
})
export class ExcelExportService {
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

  exportToExcel(
    products: Products[],
    filename: string,
    companyInfo: CompanyInfoService
  ): Promise<void> {
    // Transform data for Excel format
    const transformedData = products.map((product) => ({
      name: product.name,
      category: product.category,
      price: product.price,
      quantity: product.stocks,
      expiryDate: product.expiryDate.toLocaleDateString(),
      availability: this.getAvailabilityStatus(product),
    }));

    // Create workbook and sheets
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(transformedData);
    const companyInfoWs: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([
      ['Company Name:', companyInfo.getCompanyName()],
      ['Company Address:', companyInfo.getCompanyAddress()],
      ['Company Email:', companyInfo.getCompanyEmail()],
      ['Company Telephone:', companyInfo.getCompanyTelephone()],
      ['Printed by:'],
      ['Printed At:', new Date().toLocaleString()],
      ['Signed by:'],
    ]);

    // Append sheets to the workbook
    XLSX.utils.book_append_sheet(wb, companyInfoWs, 'Company Info');
    XLSX.utils.book_append_sheet(wb, ws, 'Product Data');

    // Write the workbook to a file
    const currentDate = new Date();
    const excelFileName = `${filename} - ${currentDate
      .toLocaleString()
      .replace(/\//g, '-')}.xlsx`;

    // Wrap the XLSX.writeFile in a Promise to make it asynchronous
    return new Promise((resolve, reject) => {
      try {
        XLSX.writeFile(wb, excelFileName);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}
