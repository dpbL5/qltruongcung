# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# communication
- Communicate in Vietnamese for this project. Confidence: 0.85
- Khi người dùng nói "bỏ nó đi" hoặc tỏ vẻ muốn xoá bỏ một tính năng trong lúc bực bội, hãy xác nhận lại phạm vi chính xác trước khi xoá code — tránh hiểu nhầm thành xoá toàn bộ thay vì đơn giản hoá/làm gọn. Confidence: 0.65

# ui
- Use a blocking overlay (modal/backdrop) when no shift is open instead of only disabling buttons and showing warning banners. The overlay must cover only the content area, leaving both the bottom navigation (mobile) and sidebar navigation (desktop) accessible. Confidence: 0.82
- On mobile, hide the sidebar navigation and logout button; they should only display on desktop ratio. Confidence: 0.65

# pricing
- Do not use peak/off-peak hour classification; use only traditional time ranges (hourFrom/hourTo) for pricing rules. Confidence: 0.75

# architecture
See [architecture/taste.md](architecture/taste.md)
