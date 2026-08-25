
#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <stdio.h>
#include <io.h>
#include <fcntl.h>
#include <wchar.h>
#include "resource.h"

int wmain()
{
	_setmode(_fileno(stdout), _O_U16TEXT);

	WCHAR buffer[64];
	buffer[0] = 0;
	LoadStringW(GetModuleHandleW(nullptr), 101, buffer, 64);
	buffer[63] = 0;
	wprintf_s(L"101:%s\n", buffer);
	return 0;
}
