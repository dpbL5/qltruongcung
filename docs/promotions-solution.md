# Thiết kế khuyến mại giờ chơi

## Phạm vi

Khuyến mại chỉ áp dụng cho tiền giờ chơi của khách `WALK_IN`. Không áp dụng cho hội viên còn hạn, hàng hóa, dịch vụ hoặc phí hội viên.

Mỗi lượt chơi chỉ nhận tối đa một khuyến mại, không cộng dồn nhiều quy tắc.

## Hai hình thức giảm

| Loại | Ý nghĩa | Công thức |
| --- | --- | --- |
| `FIXED_PER_HOUR` | Giảm một số tiền trên mỗi giờ chơi | `round(totalHours × discountValue)` |
| `PERCENT_PLAY_TIME` | Giảm phần trăm trên tổng tiền giờ chơi | `round(playSubtotal × discountValue / 100)` |

Tiền giảm luôn được chặn trong khoảng từ `0đ` đến `playSubtotal`, nên tiền giờ chơi sau giảm không thể âm.

## Thời điểm hiệu lực và snapshot

Ngày, thứ và khung giờ chỉ xác định khuyến mại có được phép chọn tại thời điểm thu tiền hay không. `hourTo` là cận độc quyền: quy tắc `17–21` có hiệu lực từ 17:00 đến trước 21:00. Các quy tắc hiệu lực cùng lúc có thể cùng tồn tại; nhân viên chọn tối đa một quy tắc phù hợp hoặc chọn không áp dụng khuyến mại.

Khi nhân viên xác nhận thu tiền cho khách vãng lai, hệ thống kiểm tra lại quy tắc được chọn còn hiệu lực, rồi snapshot ID, tên, loại và giá trị giảm vào `Session` và dòng giờ chơi của hóa đơn. Vì vậy, lịch không tự áp mã khi check-in và hóa đơn đã hoàn tất vẫn giữ được dấu vết khuyến mại đã dùng.

## Checkout và kiểm toán

Checkout tính lại bằng snapshot trong một transaction hiện có:

1. Tạo `Invoice` với `discountTotal` và tổng tiền sau giảm.
2. Ghi giảm giá vào `InvoiceItem` loại `PLAY_TIME` và metadata của dòng giờ chơi.
3. Ghi `Payment`, cập nhật `Session`, tổng chi của khách và `ActivityLog` cùng transaction.

Không tạo thêm dòng `DISCOUNT` riêng để tránh đếm đôi doanh thu/báo cáo. Báo cáo doanh thu tiếp tục đọc `Payment.grandTotal`, tức doanh thu thực thu sau khuyến mại.

## Phân quyền và giao diện

Chỉ admin được tạo, sửa hoặc tạm dừng khuyến mại. Màn `/promotions` là một màn quản trị riêng; mobile truy cập từ tab `Thêm` để giữ đúng năm tab vận hành. Trong POS, nhân viên chọn khuyến mại từ danh sách các quy tắc còn hiệu lực ngay tại mục `Thu`; backend báo giá lại và kiểm tra một lần nữa khi ghi nhận thanh toán.
