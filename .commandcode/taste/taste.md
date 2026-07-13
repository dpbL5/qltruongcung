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

# prisma
- When spreading parsed Zod schema data into a Prisma `update` or `create` call, explicitly delete nested relation fields (e.g., `delete data.tiers`) that don't exist as columns on the target table — Prisma will reject unknown fields at runtime. Confidence: 0.75
- When syncing a related collection (e.g., tiers) in a PUT route, only perform delete+recreate when the client explicitly sends the field in the request body (`parsed.data.tiers !== undefined`), not with `?? []` which conflates "not sent" with "sent empty" and silently deletes existing data on unrelated updates. Confidence: 0.75
