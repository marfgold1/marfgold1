---
name: jarkom-synack
description: Reliable UDP file transfer built from scratch — three-way handshake, sliding window, selective repeat. Two live Linux VMs talking to each other in your browser.
tags: [python, networking, udp]
status: live
featured: true
repo: https://github.com/marfgold1/jarkom-synack
demoComponent: jarkom
---

Custom transport protocol over UDP: broadcast SYN discovery, three-way handshake, sliding-window file transfer. The demo boots two Linux VMs (Alpine initramfs, ~40MB) wired on a virtual LAN — the server and client start automatically and transfer a file between them.
