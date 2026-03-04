import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { CashRegisterGuard } from '../guards/cash-register.guard';

export const REQUIRE_CASH_REGISTER_KEY = 'requireCashRegister';

export function RequireCashSession() {
  return applyDecorators(
    SetMetadata(REQUIRE_CASH_REGISTER_KEY, true),
    UseGuards(CashRegisterGuard),
  );
}
