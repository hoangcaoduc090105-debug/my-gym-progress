import { useEffect, useState } from 'react';
import { Button, Field, Modal, NumberInput, cx } from '../../components/ui';
import { nearestLoadable, platesPerSide } from '../../domain/plates';
import { fmt1 } from '../../lib/format';

/** Màu & chiều cao khối đĩa theo kích thước (gợi nhớ màu đĩa thi đấu: 25 đỏ, 20 xanh, 15 vàng, 10 lục). */
function plateStyle(kg: number): { cls: string; h: number } {
  if (kg >= 25) return { cls: 'bg-danger', h: 96 };
  if (kg >= 20) return { cls: 'bg-info', h: 90 };
  if (kg >= 15) return { cls: 'bg-warn', h: 80 };
  if (kg >= 10) return { cls: 'bg-ok', h: 70 };
  if (kg >= 5) return { cls: 'bg-surface ring-2 ring-line', h: 56 };
  if (kg >= 2.5) return { cls: 'bg-text/70', h: 44 };
  return { cls: 'bg-muted', h: 36 };
}

/**
 * Máy tính đĩa tạ: tổng tạ → mỗi bên gắn đĩa gì (vẽ khối màu theo kích thước).
 * Không gắn chính xác được => "Gần nhất: … kg" (bấm để điền vào ô).
 */
export default function PlateCalculator({
  open,
  onClose,
  initialKg,
  barWeightKg,
  platesKg,
  onFill,
}: {
  open: boolean;
  onClose: () => void;
  initialKg: number | null;
  barWeightKg: number;
  platesKg: number[];
  onFill: (kg: number) => void;
}) {
  const [total, setTotal] = useState<number | null>(initialKg);
  useEffect(() => {
    if (open) setTotal(initialKg);
  }, [open, initialKg]);
  const r = total != null && total > 0 ? platesPerSide(total, barWeightKg, platesKg) : null;
  const near = total != null && r && !r.exact ? nearestLoadable(total, barWeightKg, platesKg) : null;
  const fill = (kg: number) => {
    onFill(kg);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Đĩa tạ">
      <div className="space-y-4">
        <Field label="Tổng tạ (kg, gồm đòn)">{(id) => <NumberInput id={id} value={total} min={0} max={1000} onChange={setTotal} />}</Field>
        <p className="text-xs text-muted">
          Đòn {fmt1(barWeightKg)} kg · đĩa có: {platesKg.map(fmt1).join(', ')} kg (đổi trong Cài đặt → Tập luyện).
        </p>
        {r && (
          <div data-testid="plate-result">
            <div className="mb-1 text-sm font-semibold">Mỗi bên</div>
            {r.perSide.length === 0 ? (
              <p className="text-sm text-muted">Chỉ đòn, không gắn đĩa.</p>
            ) : (
              <>
                <div className="flex items-center gap-1 overflow-x-auto py-1" aria-hidden="true">
                  <div className="h-3 w-10 shrink-0 rounded-l bg-line" />
                  {r.perSide.map((p, i) => {
                    const st = plateStyle(p);
                    return (
                      <div key={i} className={cx('flex w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white', st.cls)} style={{ height: st.h }}>
                        <span className="-rotate-90 whitespace-nowrap mix-blend-difference">{fmt1(p)}</span>
                      </div>
                    );
                  })}
                  <div className="h-3 w-6 shrink-0 rounded-r bg-line" />
                </div>
                <p className="text-sm tabular">
                  Mỗi bên: <strong>{r.perSide.map(fmt1).join(' + ')}</strong> kg
                </p>
              </>
            )}
            {r.exact ? (
              <Button className="mt-3" block variant="primary" onClick={() => fill(r.achievedKg)}>
                Điền {fmt1(r.achievedKg)} kg
              </Button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-warn">Không gắn chính xác {fmt1(total ?? 0)} kg với đĩa đang có.</p>
                <div className="grid grid-cols-2 gap-2">
                  {near?.down != null && near.down > 0 && (
                    <Button onClick={() => fill(near.down!)} variant={near.nearest === near.down ? 'primary' : 'outline'}>
                      Gần nhất: {fmt1(near.down)} kg
                    </Button>
                  )}
                  {near?.up != null && (
                    <Button onClick={() => fill(near.up!)} variant={near.nearest === near.up ? 'primary' : 'outline'}>
                      Gần nhất: {fmt1(near.up)} kg
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
