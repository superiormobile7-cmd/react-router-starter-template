# Global Locale Standard

Every product created from this template receives a language-and-region gate and locale-aware formatting. It does not perform runtime machine translation and does not require a Workers AI binding.

## Required before release

1. Replace browser-only persistence with the product's authenticated user-profile persistence adapter.
2. Declare the product's approved, versioned interface message packs.
3. Advertise a locale only after its product copy is approved and complete.
4. Test right-to-left layout for any advertised RTL locale.
5. Do not select language or country from IP geolocation; the user chooses.

The supplied language registry is broad so users can set their formatting and text direction. That setting does not claim a product's proprietary UI copy has been localized until an approved pack exists.
