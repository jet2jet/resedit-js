; NOTE: This program is under the 0-BSD license.
;
; Copyright (C) 2021 by jet
;
; Permission to use, copy, modify, and/or distribute this software for any purpose
; with or without fee is hereby granted.
;
; THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
; REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
; FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
; INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
; OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
; TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
; THIS SOFTWARE.

org 0
  ; cs -> ds
  push cs
  pop  ds
  ; print msg
  mov  dx, msg
  mov  ah, 9
  int  21h
  ; Exit with code = 1
  mov  ax, 04C01h
  int  21h
msg:
  db 'DOS mode not supported.', 0Dh, 0Dh, 0Ah, '$'
