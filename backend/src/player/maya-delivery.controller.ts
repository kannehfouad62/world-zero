import {
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import {
  MayaDeliveryService,
  type MayaDeliveryResponse,
} from './maya-delivery.service.js';

@Controller('api/v1/me/maya')
@UseGuards(AuthGuard)
export class MayaDeliveryController {
  constructor(private readonly deliveryService: MayaDeliveryService) {}

  @Post('deliver-supplies')
  async deliverSupplies(
    @Req() request: AuthenticatedRequest,
  ): Promise<MayaDeliveryResponse> {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    return this.deliveryService.deliverSupplies(playerId);
  }
}
