import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TransactionStatus } from 'src/app/models/transaction/transaction_status';
import { TransactionType } from 'src/app/models/transaction/transaction_type';
import { Transactions } from 'src/app/models/transaction/transactions';
import { Users } from 'src/app/models/users';
import { AuthService } from 'src/app/services/auth.service';
import { PrintingService } from 'src/app/services/printing.service';
import { TransactionsService } from 'src/app/services/transactions.service';

@Component({
  selector: 'app-admin-transactions',
  templateUrl: './admin-transactions.component.html',
  styleUrls: ['./admin-transactions.component.css'],
})
export class AdminTransactionsComponent implements OnInit, OnDestroy {
  searchText: string = '';
  transactions$: Transactions[] = [];
  allTransactions$: Transactions[] = [];
  transactionSub$: Subscription;

  page = 1;
  pageSize = 20;
  collectionSize = 0;
  users$: Users | null = null;
  constructor(
    private transactionService: TransactionsService,
    private authService: AuthService,
    private printingService: PrintingService,
    private router: Router
  ) {
    this.transactionSub$ = new Subscription();
    authService.users$.subscribe((data) => {
      this.users$ = data;
    });
  }
  ngOnInit(): void {
    this.transactionSub$ = this.transactionService.transactions$.subscribe(
      (data) => {
        this.allTransactions$ = data;

        this.collectionSize = data.length;
        this.refreshTransactions();
      }
    );
  }
  ngOnDestroy(): void {
    this.transactionSub$.unsubscribe();
  }
  search() {
    if (this.searchText === '') {
      this.refreshTransactions();
    } else {
      this.transactions$ = this.allTransactions$.filter((transaction) => {
        // You can filter transactions based on multiple properties if needed
        return transaction.id
          .toLowerCase()
          .includes(this.searchText.toLowerCase());
      });
    }
  }

  refreshTransactions() {
    this.transactions$ = this.allTransactions$.slice(
      (this.page - 1) * this.pageSize,
      (this.page - 1) * this.pageSize + this.pageSize
    );
  }

  getBackgroundColor(status: TransactionStatus) {
    switch (status) {
      case TransactionStatus.ACCEPTED:
      case TransactionStatus.OUT_OF_DELIVERY:
      case TransactionStatus.READY_TO_DELIVER:
      case TransactionStatus.READY_TO_PICK_UP:
      case TransactionStatus.PENDING:
        return 'yellow'; // ongoing
      case TransactionStatus.FAILED:
      case TransactionStatus.CANCELLED:
        return 'red'; // failed
      case TransactionStatus.COMPLETED:
        return 'green'; // completed
      default:
        return 'gray';
    }
  }

  getTextColor(status: TransactionStatus) {
    switch (status) {
      case TransactionStatus.ACCEPTED:
      case TransactionStatus.OUT_OF_DELIVERY:
      case TransactionStatus.READY_TO_DELIVER:
      case TransactionStatus.READY_TO_PICK_UP:
      case TransactionStatus.PENDING:
        return 'black';
      default:
        return 'white';
    }
  }

  navigateToViewTransaction(transactionID: string) {
    let user = this.users$?.type == 'staff' ? 'staff' : 'admin';
    this.router.navigate([user + '/review-transactions/', transactionID]);
  }

  printTransaction(status: number, title: string) {
    const statusValues = Object.values(TransactionStatus);
    let data = this.allTransactions$.filter(
      (e) => e.status == statusValues[status]
    );
    this.printingService
      .printTransaction(`${title} Transactions`, data, this.users$?.name ?? '')
      .then((data) => console.log('Printing Data'));
  }
  printByType(type: number, title: string) {
    const statusValues = Object.values(TransactionType);
    let data = this.allTransactions$.filter(
      (e) => e.type == statusValues[type]
    );
    this.printingService
      .printTransaction(`${title} Transactions`, data, this.users$?.name ?? '')
      .then((data) => console.log('Printing Data'));
  }

  
}
