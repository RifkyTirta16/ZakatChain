# Design System Specification — ZakatChain (Islamic Fintech × Modern Web3)

## 1. Visual Direction
- **Concept:** Islamic Fintech × Modern Web3 × Premium Minimalism.
- **Tone:** Credible, calm, authoritative, accessible to non-technical muzakki, unmistakably backed by Ethereum verification technology.
- **Avoided:** Excessive gradients, neon cyberpunk, crypto-exchange ticker clutter, overly playful pill/toy shapes, hidden blockchain jargon on primary muzakki actions.

## 2. Color Tokens
| Token | Hex | Role |
|---|---|---|
| Primary Emerald | `#047857` | Primary brand actions, active states, verified accents |
| Deep Forest | `#064E3B` | Sidebar surface, dark section headers, secondary dark surfaces |
| Dark Forest | `#022C22` | High-emphasis headings, hero dark blocks, footer base |
| Soft Cream | `#F8F7F2` | Global application & public page canvas |
| Pure White | `#FFFFFF` | Cards, panels, inputs, modals |
| Gold Accent | `#C9A45C` | Warm Islamic fintech highlights, featured CTAs, nisab badges |
| Mint Surface | `#ECFDF5` | Subtle success/brand tint surfaces, status chips |
| Slate Text | `#334155` | Primary body copy and table text |
| Semantic Warning | `#B45309` / `#FFFBEB` | Pending / Under Review / Needs Attention |
| Semantic Danger | `#DC2626` / `#FEF2F2` | Rejected / Anomaly / Failed |
| Semantic Info | `#0369A1` / `#F0F9FF` | Submitted / Processing |

## 3. Typography
- **Headings (`font-display`):** `Plus Jakarta Sans` (weights 600, 700, 800), tight tracking (`-0.02em`).
- **Interface & Body (`font-sans`):** `Inter` (weights 400, 500, 600, 700), tabular numbers (`tabular-nums`) for all IDR amounts, percentages, and counts.
- **Arabic Content (`font-arabic`):** `Noto Naskh Arabic` (weights 400, 600, 700) for Qur'anic/Arabic motto accents where appropriate.
- **Monospace (`font-mono`):** `JetBrains Mono` / `Fira Code` / system mono for audit hashes, tx hashes, and contract addresses.

## 4. Shape, Elevation & Spacing
- **Cards:** `rounded-xl` to `rounded-2xl` (`12px–16px`), `1px solid` clean border (`border-slate-200/80`), subtle shadow `0 1px 3px rgba(2,44,34,0.06), 0 8px 24px -4px rgba(2,44,34,0.05)`.
- **Buttons:** `rounded-[10px]` (`10px–12px`), minimum height `44px` for touch accessibility, crisp `150ms` transition, clear `:focus-visible` emerald ring.
- **Inputs / Selects:** `rounded-[10px]`, white background on `#F8F7F2` or soft cream on white, clear `<label>`, visible error state.
- **Spacing Scale:** `4px` base (`gap-4`, `gap-6`, `p-5`, `p-6`, `py-12`–`py-20` on landing sections).

## 5. Official Ethereum Branding Rules
- Official 6-facet Ethereum diamond SVG (`EthereumLogo.tsx`) preserving exact vertical octahedron proportions (`viewBox="0 0 256 417"`).
- Badge `"Powered by Ethereum"` in public navbar, application sidebar footer, and footer.
- Live network badge (`NetworkBadge.tsx`) reads actual `chainId` (`31337` -> `Localhost / Hardhat`, `11155111` -> `Sepolia Testnet`, `1` -> `Ethereum Mainnet`, fallback -> `Jaringan Tidak Tersedia`).
- Never imply ETH is required for zakat payment; payments are IDR (`formatIDR`) and Ethereum serves as the immutable audit hash registry.
