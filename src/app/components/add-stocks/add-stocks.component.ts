import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ActionType, ComponentType } from 'src/app/models/audit/audit_type';
import { Products } from 'src/app/models/products';
import { UserType } from 'src/app/models/user-type';
import { Users } from 'src/app/models/users';
import { Variation } from 'src/app/models/variation';
import { AuditLogService } from 'src/app/services/audit-log.service';
import { AuthService } from 'src/app/services/auth.service';
import { ProductService } from 'src/app/services/product.service';

@Component({
  selector: 'app-add-stocks',
  templateUrl: './add-stocks.component.html',
  styleUrls: ['./add-stocks.component.css'],
})
export class AddStocksComponent implements OnInit {
  activeModal = inject(NgbActiveModal);
  @Input() product!: Products;

  users$: Users | null = null;
  expirationDate: Date | null = null;
  handleExpirationDateInput(event: Event) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.expirationDate = inputValue ? new Date(inputValue) : null;
  }
  variations$: { id: string; name: string; stocks: number }[] = [];

  newStocks = 0;
  constructor(
    private productService: ProductService,
    private toastr: ToastrService,
    private auditLogService: AuditLogService,
    private authService: AuthService
  ) {
    authService.users$.subscribe((data) => {
      this.users$ = data;
    });
  }
  ngOnInit(): void {
    this.product.variations.forEach((e) => {
      this.variations$.push({
        id: e.id,
        name: e.name,
        stocks: 0,
      });
    });
  }

  updateVariationStock(index: number, event: Event) {
    const newValue = (event.target as HTMLInputElement).value;
    const parsedValue = parseInt(newValue);
    if (!isNaN(parsedValue)) {
      this.variations$[index].stocks += parsedValue;
      console.log(this.variations$);
    }
  }

  updateProductStocks(event: Event) {
    const newStocks = (event.target as HTMLInputElement).value;
    const parsedValue = parseInt(newStocks);
    this.newStocks = this.product.stocks + parsedValue;
  }

  saveStocks() {
    // Create a map for quick lookup of variations by id
    const variationsMap = new Map(
      this.variations$.map((variation) => [variation.id, variation.stocks])
    );

    // Update stocks using a single iteration
    this.product.variations.forEach((p) => {
      const variationStocks = variationsMap.get(p.id);
      if (variationStocks !== undefined) {
        p.stocks += variationStocks;
      }
    });
    if (this.expirationDate === null) {
      this.toastr.error('Please add expiration Date');
      return;
    }

    this.productService
      .addStocks(
        this.product.id,
        this.newStocks,
        this.product.variations,
        this.expirationDate!
      )
      .then(async () => {
        await this.auditLogService.createAudit({
          id: '',
          email: this.users$?.email || '',
          role: this.users$?.type || UserType.ADMIN,
          action: ActionType.UPDATE,
          component: ComponentType.INVENTORY,
          payload: {
            message: `new stocks added`,
            productID: this.product.id,
            user: this.users$?.name,
            userId: this.users$?.id,
          },
          details: 'Adding new Stocks',
          timestamp: new Date(),
        });

        this.toastr.success('Successfully added new Stocks!');
        this.activeModal.close();
      })
      .catch((err) => this.toastr.error(err['message'].toString()));
  }
}
