import {
  Component,
  OnDestroy,
  OnInit,
  AfterViewInit,
  inject,
} from '@angular/core';
import { User } from '@angular/fire/auth';
import { Timestamp, Transaction, or } from '@angular/fire/firestore';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import * as bootstrap from 'bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { ActionType, ComponentType } from 'src/app/models/audit/audit_type';
import { Order, Products, productToOrder } from 'src/app/models/products';
import { PaymentStatus, PaymentType } from 'src/app/models/transaction/payment';
import { TransactionStatus } from 'src/app/models/transaction/transaction_status';
import { TransactionType } from 'src/app/models/transaction/transaction_type';
import { Transactions } from 'src/app/models/transaction/transactions';
import { UserType } from 'src/app/models/user-type';
import { Users } from 'src/app/models/users';
import { AuditLogService } from 'src/app/services/audit-log.service';
import { AuthService } from 'src/app/services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';
import { ProductService } from 'src/app/services/product.service';
import { TransactionsService } from 'src/app/services/transactions.service';
import {
  computeSubTotal,
  formatPrice,
  getEffectivePrice,
} from 'src/app/utils/constants';
import { ConfirmCheckoutComponent } from '../confirm-checkout/confirm-checkout.component';
import { PdfExportService } from 'src/app/services/reportgen/product/pdf-export.service';
import { LogoutComponent } from 'src/app/components/logout/logout.component';

declare var window: any;
@Component({
  selector: 'app-staff-home',
  templateUrl: './staff-home.component.html',
  styleUrls: ['./staff-home.component.css'],
})
export class StaffHomeComponent implements OnInit, AfterViewInit {
  _products: Products[] = [];
  _categories: string[] = [];
  _productItems: Order[] = [];

  _cart: Order[] = [];
  _users: Users | null = null;
  activeTab = 0;
  searchText = '';
  selectTab(index: number) {
    this.activeTab = index;
  }
  currentDate = new Date();

  searchProductName: string = ''; //Added
  filteredProducts: { [category: string]: Order[] } = {};
  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private transactionService: TransactionsService,
    private pdf: PdfExportService,
    private auditService: AuditLogService
  ) {
    this.authService.users$.subscribe((value) => {
      this._users = value;
    });
  }

  countStocks(product: Products): number {
    let count = 0;
    if (product.variations.length === 0) {
      return product.stocks;
    }
    product.variations.map((data) => (count += data.stocks));
    return count;
  }

  //added codes
  isExpired(product: Products) {
    const currentDate: Date = new Date();
    return product.expiryDate.getTime() < currentDate.getTime();
  }

  search() {
    if (this.searchText.trim() === '') {
      // If no text is entered, reset to show all products
      this.applyFilter();
    } else {
      // Filter based on the search text
      this.filteredProducts = {};
      this._categories.forEach((category) => {
        const filtered = this.filterProductsPercategory(category).filter(
          (product) =>
            product.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
            product.category.toLowerCase().includes(this.searchText.toLowerCase())
        );
        if (filtered.length) {
          this.filteredProducts[category] = filtered;
        }
      });
    }
  }

  //Search Filter
  applyFilter(): void {
    this._categories.forEach((category) => {
      const filteredProducts = this.filterProductsPercategory(category).filter(
        (product) =>
          product.name
            .toLowerCase()
            .includes(this.searchProductName.toLowerCase())
      );
      this.filteredProducts[category] = filteredProducts;
    });
  }

  getCategories(data: string[]): string[] {
    const uniqueCategoriesSet: Set<string> = new Set();
    data.forEach((category) => {
      uniqueCategoriesSet.add(category);
    });
    return Array.from(uniqueCategoriesSet);
  }

  ngOnInit(): void {
    this.productService.getAllProducts().subscribe((data: Products[]) => {
      this._categories = this.getCategories(
        data.map((e) => e.category.toLowerCase())
      );
      this._productItems = [];
      this._products = data.filter(
        (e) =>
          e.expiryDate.getTime() > new Date().getTime() && e.isHidden === false
      );
      this._products.map((product) => {
        this._productItems.push(...productToOrder(product));
      });
      this.applyFilter();
    });
  }

  filterProductsPercategory(category: string): Order[] {
    return this._productItems.filter(
      (e) => e.category.toLowerCase() === category.toLowerCase()
    );
  }

  ngAfterViewInit(): void {
    const element = document.getElementById('productTabs');
    if (element) {
      new bootstrap.Tab(element).show();
    }
  }

  private modalService = inject(NgbModal);
  showConfirmCheckoutDialog() {
    const modal = this.modalService.open(ConfirmCheckoutComponent, {
      size: 'xl',
    });

    modal.componentInstance.users = this._users;
    modal.componentInstance.orders = this._cart;
    modal.result
      .then((data: any) => {
        let transaction = data as Transactions;
        if (transaction) {
          this.confirmOrder(transaction);
        } else {
          this.toastr.error('Invalid transaction');
        }
      })
      .catch((err) => {
        this.toastr.error(err.toString());
      });
  }
  formatPrice(num: number): string {
    return formatPrice(num);
  }
  addOrder(order: Order) {
    if (!this._cart.includes(order)) {
      this._cart.unshift(order);
    }
  }

  logout() {
    this.modalService.open(LogoutComponent);
  }
  increaseQuantity(index: number, order: Order) {
    if (order.stocks > order.quantity) {
      this._cart[index].quantity += 1;
    }
  }
  decreaseQuantity(index: number) {
    let order = this._cart[index];
    if (order.quantity < 2) {
      this._cart.splice(index, 1);
    } else {
      this._cart[index].quantity -= 1;
    }
  }
  subtotal(orders: Order[]): string {
    return formatPrice(computeSubTotal(orders));
  }

  openModal() {
    if (this._cart.length === 0) {
      this.toastr.warning(
        'Please add product to checkout',
        'No product in cart'
      );
      return;
    }
    if (this._users === null) {
      this.toastr.error('No cashier logged in!', 'Invalid Transaction');
      return;
    }
    this.showConfirmCheckoutDialog();
  }

  confirmOrder(transaction: Transactions) {
    this.loadingService.showLoading('checkout');
    this.transactionService
      .createTransaction(transaction)
      .then(async (task) => {
        await this.productService
          .batchUpdateProductQuantity(transaction.orderList)
          .then((da) => {
            this.pdf.exportTransaction(transaction, this._users ?? null);
          });

        this.toastr.success('transasction success');
      })
      .catch((err) => this.toastr.error(err.message))
      .finally(async () => {
        await this.auditService.createAudit({
          id: '',
          email: this._users?.email ?? '',
          role: UserType.STAFF,
          action: ActionType.CREATE,
          component: ComponentType.TRANSACTION,
          payload: {
            message: `Order confirmed`,
            cashier: `${this._users?.name}`,
            date: new Date().toLocaleDateString(),
          },
          details: 'Adding transaction',
          timestamp: new Date(),
        });

        this.loadingService.hideLoading('checkout');

        this._cart = [];
      });
  }

  encodedUser() {
    return JSON.stringify(this._users);
  }
  signOut() {
    this.authService.logout();
  }
  toProductStatus(order: Order): string {
    let quantity = order.stocks;
    let expiration = order.expiration;

    // Check if expired
    if (expiration.getTime() < this.currentDate.getTime()) {
      return 'expired';
    } else {
      if (quantity <= 0) {
        return 'out of stock';
      } else if (quantity <= 50) {
        return 'low stock';
      } else {
        return 'in stock';
      }
    }
  }
}
