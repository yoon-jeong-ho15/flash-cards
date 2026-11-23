import { HorizontalVelocity } from "./flick";

// The horizontal origin follows vertical scrolling until a sideways drag starts.
export class CardPan {
  private anchor: { x: number; y: number };
  private previousY: number;
  private horizontal = false;
  private velocityX = new HorizontalVelocity();
  private velocityY = new HorizontalVelocity();

  constructor(x: number, y: number, time: number) {
    this.anchor = { x, y };
    this.previousY = y;
    this.velocityX.sample(x, time);
    this.velocityY.sample(y, time);
  }

  sample(x: number, y: number, time: number) {
    const dx = x - this.anchor.x;
    const dy = y - this.anchor.y;
    const scrollY = y - this.previousY;
    this.previousY = y;
    const velocityX = this.velocityX.sample(x, time);
    const velocityY = this.velocityY.sample(y, time);

    if (!this.horizontal && Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      this.horizontal = true;
    }
    if (!this.horizontal && Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
      this.anchor = { x, y };
    }
    return { horizontal: this.horizontal, dx, dy, scrollY, velocityX, velocityY };
  }
}
