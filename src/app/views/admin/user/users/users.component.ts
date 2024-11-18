import { Component, OnInit, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subscription } from 'rxjs';
import { Users } from 'src/app/models/users';
import { AuthService } from 'src/app/services/auth.service';
import { AddUserComponent } from '../add-user/add-user.component';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export class UsersComponent implements OnInit {
  adminUsers: Users[] = [];
  staffUsers: Users[] = [];
  users$: Users | null = null;
  private modalService = inject(NgbModal);

  constructor(private authService: AuthService, private toastr: ToastrService) {
    authService.users$.subscribe((data) => {
      this.users$ = data;
    });
  }

  ngOnInit(): void {
    this.authService.getAllUsers().subscribe((users) => {
      this.adminUsers = users.filter((user) => user.type === 'admin');
      this.staffUsers = users.filter((user) => user.type !== 'admin');
    });
  }

  deleteAccount(users: Users) {
    const modal = this.modalService.open(DeleteConfirmationComponent);
    modal.componentInstance.message = `Are you sure you want to delete ${users.name} account ? `;
    modal.result.then((data) => {
      if (data === 'YES') {
        this.authService
          .deleteAccount(users.id)
          .then((data) => {
            this.toastr.success('Successfully Deleted');
          })
          .catch((err) => {
            this.toastr.error(err['message'].toString());
          });
      }
    });
  }

  addStaff() {
    this.modalService.open(AddUserComponent);
  }
}
