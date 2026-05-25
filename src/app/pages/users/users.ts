import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-users',
  imports: [CommonModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  users: any[] = [];
  
  constructor(private http: HttpClient) {}

  ngOnInit() {
    // this.http.get<any[]>(`${environment.apiUrl}/users`).subscribe({
    //   next: (data) => this.users = data,
    //   error: (err) => console.error('Failed to load users', err)
    // });
  }
}
