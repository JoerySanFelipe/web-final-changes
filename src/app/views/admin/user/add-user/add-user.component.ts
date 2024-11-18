import { Component, inject } from '@angular/core';
import { User } from '@angular/fire/auth';
import { where } from '@angular/fire/firestore';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { user } from 'rxfire/auth';
import { UserType } from 'src/app/models/user-type';
import { Users } from 'src/app/models/users';
import { AuthService } from 'src/app/services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';
import { v4 as uuidv4 } from 'uuid';
@Component({
  selector: 'app-add-user',
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.css'],
})
export class AddUserComponent {
  activeModal = inject(NgbActiveModal);
  userTypes$ = Object.values(UserType);
  users$: Users[] = [];
  userForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    address: new FormControl('', [Validators.required]),
    type: new FormControl(null, [Validators.required]),
    phone: new FormControl('', [Validators.required]),
  });
  constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    public loadingService: LoadingService
  ) {}
  submitUser() {
    if (this.userForm.valid) {
      const { name, email, address, type, phone } = this.userForm.controls;

      const emailExists = this.users$.some(
        (user) => user.email === email.value
      );

      if (emailExists) {
        this.toastr.warning('Email exists');
        return;
      }

      const newUser: Users = {
        id: uuidv4(),
        name: name.value ?? '',
        profile: '',
        phone: phone.value ?? '',
        email: email.value ?? '',
        address: address.value ?? '',
        type: this.getUserType(type.value ?? 'staff'),
      };

      // Save the user account
      this.saveAccount(newUser);
    }
  }

  getUserType(type: string): UserType {
    if (type === 'staff') {
      return UserType.STAFF;
    } else if (type === 'admin') {
      return UserType.ADMIN;
    } else {
      return UserType.DRIVER;
    }
  }

  saveAccount(user: Users) {
    this.loadingService.showLoading('user');
    this.authService
      .saveUserAccount(user)
      .then((value) => {
        this.toastr.success('new user created!', 'Successfully created');
      })
      .catch((err) => this.toastr.error(err.message, 'Error saving account'))
      .finally(() => {
        this.loadingService.hideLoading('user');
        this.activeModal.close();
      });
  }
}
