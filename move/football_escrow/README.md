# Football multi escrow (testnet)

Testnet only. Stakes are play-money KICK, with no real value.

- `create_slip<T>`: the owner escrows a stake in a shared Slip, with the off-chain slip ID.
- `settle_slip<T>`: the server (holder of the AdminCap) settles the slip with the graded outcome. A win needs the payout covered by the stake plus the admin's top-up. A void refunds the stake. A loss pays nothing.
- `claim<T>`: the owner withdraws the payout once.

Limits to state in the terms:
- The server signs the result. The contract does not check the football data itself.
- The admin funds the difference between a win's payout and its stake. Without a funded house, winning slips cannot be paid.
- Kick Markets use the rounds contract (`move/kick`), which already holds stakes in escrow.
