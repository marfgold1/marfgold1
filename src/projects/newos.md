---
name: newos
description: 16-bit real-mode operating system from scratch — bootloader, kernel, filesystem, shell. Bootable in your browser via v86.
tags: [c, nasm, osdev]
status: live
featured: true
repo: https://github.com/marfgold1/newos
demoComponent: newos
---

Bootloader + kernel + system calls, written in C (bcc) and assembly (nasm), runs from a 1.44MB floppy image.

This was a course project. The trickiest part was interrupt handling — the bootloader jumps to real mode, the kernel sets up its own IDT, and user programs talk to the shell through syscalls. Everything fits on one floppy, which forces you to be honest about size.
