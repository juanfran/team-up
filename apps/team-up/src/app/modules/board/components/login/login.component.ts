import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { ConfigService } from '../../../../services/config.service';

@Component({
  selector: 'team-up-login',
  styleUrls: ['./login.component.scss'],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatButtonModule, MatIconModule, SvgIconComponent],
})
export class LoginComponent {
  constructor(private configService: ConfigService) {}

  loginGoogle() {
    window.location.href = `${this.configService.config.API}/auth`;
  }
}
