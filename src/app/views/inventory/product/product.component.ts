import { Component, OnDestroy, OnInit } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { NavigationExtras, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subscription, map } from 'rxjs';

import { Products } from 'src/app/models/products';
import { Users } from 'src/app/models/users';
import { Variation } from 'src/app/models/variation';
import { AuthService } from 'src/app/services/auth.service';
import { DateConverterService } from 'src/app/services/date-converter.service';
import { LoadingService } from 'src/app/services/loading.service';

import { ProductService } from 'src/app/services/product.service';
import { CompanyInfoService } from 'src/app/services/reportgen/company-info/company-info.service';
import { ExcelExportService } from 'src/app/services/reportgen/product/excel-export.service';
import { PdfExportService } from 'src/app/services/reportgen/product/pdf-export.service';

import { formatPrice } from 'src/app/utils/constants';
import { ProductCalculator } from 'src/app/utils/product_calc';

import * as echarts from 'echarts'; // added ECharts run on terminal "npm install echarts --save"

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
})
export class ProductComponent implements OnInit {
  _products!: Observable<Products[]>;

  _selectedProduct: Products | null = null;
  _PRODUCTS: Products[] = [];
  productCalculator: ProductCalculator;
  users$: Users | null = null;

  filteredProducts: Products[] = [];
  filter: string = '';

  page = 1;
  pageSize = 10;
  collectionSize = 0;
  searchText = '';
  search() {
    this.filteredProducts = [...this._PRODUCTS];
    this.filteredProducts = this.filteredProducts.filter((p) => {
      let input = this.searchText.toLowerCase();
      let name = p.name.toLowerCase();
      let category = p.category.toLowerCase();
      return name.includes(input) || category.includes(input);
    });
  }
  constructor(
    private productService: ProductService,
    public dateService: DateConverterService,
    private toastr: ToastrService,
    private router: Router,
    public loadingService: LoadingService,
    public authService: AuthService,
    private pdfExportService: PdfExportService,
    private excelExportService: ExcelExportService
  ) {
    this.productCalculator = new ProductCalculator([]);
    authService.users$.subscribe((data) => {
      this.users$ = data;
    });
  }

  private initializeProducts(): void {
    this.productService.getAllProducts().subscribe((data: Products[]) => {
      console.log(data);
      this.productService.setProduct(data);
      this._PRODUCTS = data;
      this.collectionSize = data.length;
      this.filteredProducts = data;
      this.productCalculator = new ProductCalculator(this._PRODUCTS);

      this.renderProductAvailabilityChart();
      this.renderProductCategoryQuantity();
    });
  }
  computeStocksPerCategory(category: string): number {
    let total = 0;
    this._PRODUCTS.map((e) => {
      if (e.category == category) {
        total += this.countStocks(e);
      }
    });

    return total;
  }

  //changed to  pie chart
  renderProductCategoryQuantity() {
    const chartElement = document.getElementById('category-stocks');
    const chart = echarts.init(chartElement);

    const categories = Array.from(
      new Set(this._PRODUCTS.map((e) => e.category))
    );
    const quantities = categories.map((category) =>
      this.computeStocksPerCategory(category)
    );

    const option = {
      title: {
        text: '',
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
      },
      legend: {
        orient: 'horizontal',
        bottom: 'bottom',
        data: categories,
      },
      series: [
        {
          name: 'Stocks',
          type: 'pie',
          radius: ['25%', '80%'],
          center: ['50%', '50%'],
          data: categories.map((category, index) => ({
            name: category,
            value: quantities[index],
          })),
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
    chart.setOption(option);
  }

  sortFilteredProducts(): void {
    this.filteredProducts.sort(
      (a, b) =>
        (b.updatedAt || b.createdAt).getTime() -
        (a.updatedAt || a.createdAt).getTime()
    );
  }
  //end of refactor

  ngOnInit(): void {
    // refactor code
    this.initializeProducts();
  }

  applyFilter(selectedFilter: string) {
    this.filter = selectedFilter;
    this.filterProducts();
  }

  // updated code - Joery
  filterProducts() {
    this.filteredProducts = [...this._PRODUCTS];
    switch (this.filter) {
      case 'inStock':
        this.filteredProducts = this.filteredProducts
          .filter((product) => this.countStocks(product) > 20)
          .filter(
            (product) => product.expiryDate.getTime() > new Date().getTime()
          );
        this.filteredProducts.sort(
          (a, b) => this.countStocks(a) - this.countStocks(b)
        );
        break;
      case 'lowStock':
        this.filteredProducts = this.filteredProducts
          .filter(
            (product) =>
              this.countStocks(product) >= 1 && this.countStocks(product) < 20
          )
          .filter(
            (product) => product.expiryDate.getTime() > new Date().getTime()
          );
        this.filteredProducts.sort(
          (a, b) => this.countStocks(a) - this.countStocks(b)
        );
        break;

      case 'outOfStock':
        this.filteredProducts = this.filteredProducts.filter(
          (product) => this.countStocks(product) === 0
        );
        break;
      case 'toBeExpired':
        const currentDate = new Date();
        const thresholdDate = new Date(
          currentDate.getTime() + 60 * 24 * 60 * 60 * 1000
        ); // 60 days
        this.filteredProducts = this.filteredProducts.filter(
          (product) =>
            product.expiryDate.getTime() <= thresholdDate.getTime() &&
            product.expiryDate.getTime() >= currentDate.getTime()
        );
        break;
      case 'expired':
        const currentdate = new Date();
        this.filteredProducts = this.filteredProducts.filter(
          (product) => product.expiryDate.getTime() < currentdate.getTime()
        );
        break;
      default:
        break;
    }
  }

  exportToPdf(): void {
    this.pdfExportService.exportProductsToPdf(this.filteredProducts);
  }
  exportToExcel(): void {
    const excelService = new ExcelExportService(); // Create an instance
    const filename = 'YourFilename'; // Provide a filename here
    const companyInfo = new CompanyInfoService(); // Create an instance of CompanyInfoService

    excelService.exportToExcel(this.filteredProducts, filename, companyInfo);
  }

  convertTimestamp(timestamp: any) {
    const date = new Date(
      timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000
    );
    return date.toLocaleDateString();
  }
  selectedProduct(index: number) {
    console.log(index);
    if (this._PRODUCTS && index >= 0 && index < this._PRODUCTS.length) {
      this._selectedProduct = this._PRODUCTS[index];
    } else {
      this._selectedProduct = null;
    }
  }

  findHighestLowestPrice(variations: Variation[]): string {
    let arr = variations.map((data) => data.price);
    if (arr.length === 0) {
      throw new Error('Array is empty.');
    }
    const highest = Math.max(...arr);
    const lowest = Math.min(...arr);

    const highestFormatted = highest.toLocaleString('en-US', {
      style: 'currency',
      currency: 'PHP',
    });
    const lowestFormatted = lowest.toLocaleString('en-US', {
      style: 'currency',
      currency: 'PHP',
    });

    return ` ${lowestFormatted} - ${highestFormatted}`;
  }
  countStocks(product: Products): number {
    let count = 0;
    if (product.variations.length === 0) {
      return product.stocks;
    }
    product.variations.map((data) => (count += data.stocks));
    return count;
  }

  viewProduct(product: Products) {
    this.router.navigate([this.users$?.type + '/view-product', product.id]);
    // navigationExtras
  }

  formatPHP(num: number) {
    return formatPrice(num);
  }
  getUserType() {
    if (this.users$?.type === 'staff') {
      return 'staff';
    }
    return 'admin';
  }

  displayExpiryDate(expiryDate: Date): string {
    const currentDate = new Date();
    const oneWeek = 60 * 24 * 60 * 60 * 1000; // 2months or 60 days instead of 1 week

    if (expiryDate.getTime() >= currentDate.getTime()) {
      const timeDiff = expiryDate.getTime() - currentDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      if (daysDiff <= 0) {
        return 'Exceeded';
      } else if (daysDiff <= 60) {
        return `${daysDiff} day${daysDiff === 1 ? '' : 's'} left`;
      } else {
        const month = expiryDate.getMonth() + 1;
        const day = expiryDate.getDate();
        const year = expiryDate.getFullYear();
        return `${month}/${day}/${year}`;
      }
    } else {
      return 'Exceeded';
    }
  }

  refreshProducts() {
    this.filteredProducts = this._PRODUCTS.slice(
      (this.page - 1) * this.pageSize,
      (this.page - 1) * this.pageSize + this.pageSize
    );
  }

  //added codes
  isExpired(product: Products) {
    const currentDate: Date = new Date();
    return product.expiryDate.getTime() < currentDate.getTime();
  }

  isToBeExpired(product: any): boolean {
    const currentDate = new Date();
    const thresholdDate = new Date(
      currentDate.getTime() + 60 * 24 * 60 * 60 * 1000
    ); // 60 days from now
    return (
      product.expiryDate.getTime() <= thresholdDate.getTime() &&
      product.expiryDate.getTime() >= currentDate.getTime()
    );
  }

  // added chart product availability
  renderProductAvailabilityChart(): void {
    const chartElement = document.getElementById('product-availability');
    const chart = echarts.init(chartElement);

    const categories = [
      'In stock',
      'Low in stock',
      'Out of stock',
      'To expire',
      'Expired',
    ];
    const quantities = [
      this.productCalculator.countInStockProducts(),
      this.productCalculator.countProductsLessThan20(),
      this.productCalculator.countProductsNoStocks(),
      this.productCalculator.countToBeExpiredProducts(),
      this.productCalculator.countExpiredProducts(),
    ];

    const option = {
      title: {
        text: '',
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
      },
      legend: {
        orient: 'horizontal',
        bottom: 'bottom',
        data: categories,
      },
      series: [
        {
          name: 'Availability',
          type: 'pie',
          radius: ['25%', '80%'],
          center: ['50%', '50%'],
          data: categories.map((category, index) => ({
            value: quantities[index],
            name: category,
          })),
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
    chart.setOption(option);
  }
}
