/**
 * Hướng dẫn kỹ thuật chi tiết cho người mới (bổ sung vào thư viện bài tập).
 * Tổng hợp theo nguyên tắc kỹ thuật trong Haff & Triplett (2016), Essentials of Strength Training and Conditioning (4th ed.).
 * Mang tính tham khảo — buổi đầu nên nhờ huấn luyện viên tại phòng tập quan sát kỹ thuật.
 */
export interface ExerciseGuide {
  setup: string[];
  breathing: string;
  feel: string;
  tips: string[];
}

export const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {
  'goblet-squat': {
    setup: [
      'Chọn tạ đơn hoặc tạ ấm nhẹ, ôm một đầu tạ sát ngực, hai khuỷu tay hướng xuống dưới.',
      'Đứng chân rộng bằng hoặc hơn vai một chút, mũi chân mở ra khoảng 15–30°.',
      'Ngực mở, mắt nhìn thẳng, siết bụng như chuẩn bị có người ấn nhẹ vào bụng.',
    ],
    breathing: 'Hít sâu vào bụng và giữ hơi khi ngồi xuống; thở ra khi đã qua đoạn khó nhất lúc đứng lên.',
    feel: 'Đùi trước và mông. Lưng dưới không được đau.',
    tips: [
      'Tuần đầu: tập không tạ, ngồi xuống chạm nhẹ ghế rồi đứng lên, 2 hiệp × 10 lần.',
      'Gót bị nhấc lên: giảm độ sâu hoặc kê gót bằng đĩa tạ mỏng.',
      'Nhịp: xuống 2–3 giây, đứng lên dứt khoát.',
    ],
  },
  'db-bench-press': {
    setup: [
      'Ngồi ở mép ghế, đặt hai tạ lên đùi. Nằm ngửa ra, đồng thời dùng gối hẩy tạ lên ngang ngực.',
      'Bàn chân đặt chắc trên sàn. Kéo bả vai về sau và xuống, như đang kẹp một cây bút giữa hai bả vai.',
      'Lòng bàn tay hướng về phía chân, cổ tay thẳng, cẳng tay vuông góc với sàn.',
    ],
    breathing: 'Hít vào khi hạ tạ, thở ra khi đẩy lên.',
    feel: 'Ngực là chính; tay sau và vai trước hỗ trợ.',
    tips: [
      'Kết thúc hiệp: đưa tạ về ngực, co gối, đặt tạ lên đùi rồi ngồi dậy. Không thả tạ sang hai bên.',
      'Khuỷu tay chếch khoảng 45–70° so với thân, không mở ngang 90°.',
      'Hạ chậm 2–3 giây, không bật tạ ở đáy.',
    ],
  },
  'seated-cable-row': {
    setup: [
      'Ngồi, đặt chân lên bàn đạp, gối hơi chùng.',
      'Nắm tay cầm, ngồi thẳng lưng với thân vuông góc sàn, hai tay duỗi.',
      'Ngực mở, vai hạ xuống xa tai.',
    ],
    breathing: 'Thở ra khi kéo về bụng, hít vào khi duỗi tay về trước.',
    feel: 'Giữa lưng và hai bên lưng (cơ xô); tay trước hỗ trợ.',
    tips: [
      'Nghĩ là "kéo bằng khuỷu tay", không phải kéo bằng bàn tay.',
      'Dừng 1 giây khi tay cầm chạm bụng, siết hai bả vai lại với nhau.',
      'Thân gần như đứng yên. Phải ngả lưng nhiều là tạ đang quá nặng.',
    ],
  },
  'db-rdl': {
    setup: [
      'Đứng chân rộng bằng hông, cầm hai tạ đơn trước đùi, lòng bàn tay hướng vào người.',
      'Gối hơi chùng và giữ nguyên góc gối này suốt bài.',
      'Siết bụng, kéo vai về sau, lưng thẳng tự nhiên.',
    ],
    breathing: 'Hít vào và giữ hơi khi gập hông xuống; thở ra khi đứng thẳng lên.',
    feel: 'Căng ở đùi sau khi hạ xuống, mông siết khi đứng lên. Không được mỏi hay đau lưng dưới.',
    tips: [
      'Tưởng tượng dùng mông đẩy để đóng cánh cửa xe phía sau lưng.',
      'Chỉ hạ tới khi đùi sau căng — với người mới thường ở khoảng ngang gối đến giữa ống chân. Không cần chạm sàn.',
      'Tạ luôn trượt sát đùi và ống chân.',
    ],
  },
  'lateral-raise': {
    setup: ['Đứng thẳng, chân rộng bằng hông, hai tạ đơn nhẹ ở hai bên đùi.', 'Khuỷu tay hơi cong, thân nghiêng nhẹ về trước.'],
    breathing: 'Thở ra khi nâng, hít vào khi hạ.',
    feel: 'Vai giữa (phần ngoài của vai). Cổ và cơ thang mỏi nhiều là dấu hiệu đang nhún vai.',
    tips: [
      'Bài này cần tạ nhẹ: kỹ thuật quan trọng hơn mức tạ.',
      'Dẫn bằng khuỷu tay, như đang đẩy hai bức tường sang hai bên.',
      'Dừng ở ngang vai, hạ chậm 2–3 giây.',
    ],
  },
  'dead-bug': {
    setup: [
      'Nằm ngửa, hai tay thẳng hướng lên trần, hông và gối gập 90° (cẳng chân song song với sàn).',
      'Ép lưng dưới xuống sàn, không để khe hở giữa lưng và sàn.',
    ],
    breathing: 'Thở ra chậm khi duỗi tay và chân ra xa; hít vào khi thu về.',
    feel: 'Bụng gồng liên tục suốt bài.',
    tips: [
      'Lưng dưới bật khỏi sàn là đang duỗi quá xa — thu ngắn biên độ lại.',
      'Làm chậm, mỗi lần khoảng 3–4 giây.',
      'Mỗi bên tính là 1 lần.',
    ],
  },
  'leg-press': {
    setup: [
      'Chỉnh lưng ghế sao cho khi hạ xuống, gối gập khoảng 90° mà mông không bị nhấc khỏi đệm.',
      'Đặt bàn chân rộng bằng vai ở giữa bàn đạp, mũi chân hơi mở.',
      'Tay nắm tay vịn hai bên, lưng và mông áp sát đệm.',
    ],
    breathing: 'Hít vào khi hạ bàn đạp, thở ra khi đẩy lên.',
    feel: 'Đùi trước và mông.',
    tips: [
      'Đẩy bàn đạp lên rồi mới mở khóa an toàn; khóa lại trước khi rời máy.',
      'Đẩy bằng cả bàn chân, lực dồn ở giữa bàn chân và gót.',
      'Không khóa thẳng gối ở đỉnh.',
    ],
  },
  'seated-db-shoulder-press': {
    setup: [
      'Chỉnh lưng ghế gần thẳng đứng.',
      'Ngồi, đặt tạ lên đùi, lần lượt hẩy gối để đưa tạ lên ngang vai.',
      'Lưng áp đệm, bụng siết, khuỷu tay hơi hướng về trước (không bè hẳn sang ngang).',
    ],
    breathing: 'Thở ra khi đẩy lên, hít vào khi hạ.',
    feel: 'Vai trước và vai giữa; tay sau hỗ trợ.',
    tips: [
      'Không ưỡn lưng để đẩy. Phải ưỡn mới đẩy được thì giảm tạ.',
      'Hạ tới khi tạ ngang tai hoặc ngang cằm.',
      'Hai tạ hơi chụm vào ở đỉnh, không cần đập vào nhau.',
    ],
  },
  'lat-pulldown': {
    setup: [
      'Chỉnh đệm đùi để giữ chặt chân khi kéo.',
      'Đứng lên nắm thanh rộng hơn vai một chút rồi ngồi xuống, tay duỗi thẳng.',
      'Ngực mở, thân hơi ngả ra sau.',
    ],
    breathing: 'Thở ra khi kéo xuống, hít vào khi để tay đi lên.',
    feel: 'Hai bên lưng (cơ xô), lan xuống dưới nách; tay trước hỗ trợ.',
    tips: [
      'Bắt đầu mỗi lần bằng việc kéo vai xuống, sau đó mới gập khuỷu.',
      'Tưởng tượng nhét khuỷu tay vào túi quần sau.',
      'Kéo thanh về ngực trên, không kéo ra sau gáy.',
    ],
  },
  'lying-leg-curl': {
    setup: ['Chỉnh đệm chân nằm ngay trên gót chân.', 'Nằm sấp, đầu gối ngay mép đệm, tay nắm tay cầm.'],
    breathing: 'Thở ra khi cuốn lên, hít vào khi hạ.',
    feel: 'Đùi sau.',
    tips: ['Ép hông xuống đệm suốt bài.', 'Dừng 1 giây ở đỉnh, hạ chậm 2–3 giây.'],
  },
  'cable-crunch': {
    setup: [
      'Gắn dây thừng vào ròng rọc cao, quỳ gối cách máy khoảng nửa mét.',
      'Hai tay giữ dây cạnh đầu, hông cao hơn gót.',
    ],
    breathing: 'Thở ra mạnh khi cuộn xuống, hít vào khi trở về.',
    feel: 'Bụng — không phải tay hay hông.',
    tips: [
      'Cuộn tròn cột sống, mắt nhìn về phía rốn.',
      'Hông giữ cố định. Mông ngồi xuống gót là đang dùng hông thay bụng.',
      'Bắt đầu với mức nhẹ để học đúng cảm giác.',
    ],
  },
  'standing-calf-raise': {
    setup: [
      'Đứng mũi bàn chân trên bục hoặc mép bậc, gót thả tự do; vai đặt dưới đệm máy (hoặc cầm tạ đơn, tay kia vịn).',
      'Gối thẳng nhưng không khóa cứng.',
    ],
    breathing: 'Thở đều; thở ra khi nhón lên.',
    feel: 'Bắp chân.',
    tips: ['Biên độ đầy đủ quan trọng hơn mức tạ: hạ gót sâu, nhón thật cao.', 'Dừng 1–2 giây ở dưới để không nảy.'],
  },
  'bulgarian-split-squat': {
    setup: [
      'Đứng quay lưng về ghế cao ngang gối, đặt mu bàn chân sau lên ghế.',
      'Bước chân trước ra xa, sao cho khi hạ xuống gối trước nằm khoảng trên cổ chân.',
      'Hai tay cầm tạ đơn thả dọc thân. Mới tập thì không cầm tạ, một tay vịn tường.',
    ],
    breathing: 'Hít vào khi hạ xuống, thở ra khi đứng lên.',
    feel: 'Đùi trước và mông của chân trước.',
    tips: [
      'Bài khó giữ thăng bằng — 1–2 tuần đầu tập không tạ.',
      'Thân hơi nghiêng về trước giúp mông làm việc nhiều hơn.',
      'Làm hết số lần một bên rồi đổi bên. Ô "Lần" ghi số lần của MỘT bên.',
    ],
  },
  'incline-db-press': {
    setup: [
      'Chỉnh ghế dốc khoảng 30° (2–3 nấc).',
      'Ngồi, đặt tạ trên đùi, nằm ra và đưa tạ lên ngang ngực trên.',
      'Kẹp bả vai về sau, chân đặt chắc trên sàn.',
    ],
    breathing: 'Hít vào khi hạ, thở ra khi đẩy.',
    feel: 'Ngực trên; vai trước và tay sau hỗ trợ.',
    tips: ['Ghế càng dốc thì vai làm càng nhiều — khoảng 30° là đủ.', 'Hạ có kiểm soát 2–3 giây.'],
  },
  'one-arm-db-row': {
    setup: [
      'Đặt gối và bàn tay cùng bên lên ghế phẳng; chân kia đứng chắc trên sàn.',
      'Lưng phẳng, gần song song với sàn; tay kia cầm tạ thả thẳng xuống.',
    ],
    breathing: 'Thở ra khi kéo lên, hít vào khi hạ.',
    feel: 'Lưng cùng bên (cơ xô), phía dưới bả vai.',
    tips: [
      'Kéo tạ theo đường cung về phía hông, như đang tra kiếm vào bao.',
      'Thân không xoay. Phải xoay người mới kéo được thì giảm tạ.',
      'Ô "Lần" ghi số lần của MỘT bên.',
    ],
  },
  'hip-thrust': {
    setup: [
      'Ngồi trên sàn, lưng trên (ngay dưới bả vai) tựa vào mép ghế phẳng.',
      'Đặt thanh đòn có đệm, hoặc một tạ đơn, lên nếp hông.',
      'Bàn chân rộng bằng hông, đặt sao cho ở đỉnh động tác cẳng chân vuông góc với sàn.',
    ],
    breathing: 'Hít vào ở dưới, thở ra khi đẩy hông lên.',
    feel: 'Mông là chính; đùi sau hỗ trợ.',
    tips: [
      'Mới tập: một tạ đơn đặt trên hông, hoặc chỉ dùng trọng lượng cơ thể.',
      'Cằm hơi cúi, mắt nhìn về trước giúp không ưỡn lưng.',
      'Siết mông 1 giây ở đỉnh.',
    ],
  },
  'db-curl': {
    setup: ['Đứng thẳng, tạ đơn ở hai bên, lòng bàn tay hướng về trước.', 'Khuỷu tay áp sát hai bên hông.'],
    breathing: 'Thở ra khi cuốn lên, hít vào khi hạ.',
    feel: 'Bắp tay trước.',
    tips: ['Khuỷu tay đứng yên như một cái bản lề.', 'Hạ chậm và duỗi hết tay — pha hạ tạ cũng có tác dụng.'],
  },
  'triceps-pushdown': {
    setup: ['Gắn thanh thẳng hoặc dây thừng vào ròng rọc cao.', 'Đứng gần máy, hơi nghiêng người về trước, khuỷu tay ép sát hông.'],
    breathing: 'Thở ra khi đẩy xuống, hít vào khi trở về.',
    feel: 'Mặt sau cánh tay.',
    tips: ['Chỉ cẳng tay di chuyển; cánh tay trên đứng yên.', 'Duỗi hết tay ở dưới, dừng 1 giây.'],
  },
  'seated-calf-raise': {
    setup: ['Ngồi máy, đặt đệm lên đùi gần gối.', 'Mũi bàn chân trên bục, gót thả tự do.'],
    breathing: 'Thở đều; thở ra khi nhón lên.',
    feel: 'Bắp chân (phần cơ phía dưới).',
    tips: ['Hạ gót sâu, nhón cao, dừng 1–2 giây ở mỗi đầu.'],
  },
  'push-up': {
    setup: [
      'Chống tay rộng hơn vai một chút, ngón tay hướng về trước.',
      'Duỗi chân ra sau, thân thẳng một đường từ đầu tới gót.',
      'Siết bụng và mông.',
    ],
    breathing: 'Hít vào khi hạ người, thở ra khi đẩy lên.',
    feel: 'Ngực, tay sau, vai trước; bụng gồng giữ thân thẳng.',
    tips: [
      'Chưa làm được 8 lần đúng kỹ thuật: chống tay lên ghế hoặc bàn (càng cao càng dễ).',
      'Ghi 0 kg ở ô "kg".',
    ],
  },
  plank: {
    setup: ['Chống cẳng tay xuống sàn, khuỷu ngay dưới vai.', 'Duỗi chân, thân thẳng từ đầu tới gót.'],
    breathing: 'Thở đều, chậm. Không nín thở.',
    feel: 'Bụng và toàn bộ thân giữa.',
    tips: ['Bắt đầu 20–30 giây mỗi hiệp; ghi số GIÂY vào ô "Lần".', 'Hông xệ xuống hoặc chổng cao là nên dừng hiệp.'],
  },
};

export { GENERIC_BREATHING } from './genericBreathing';
