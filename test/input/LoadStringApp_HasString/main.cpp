
#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <wchar.h>
#include "resource.h"

int wmain()
{
	WCHAR buffer[64];
	buffer[0] = 0;
	LoadStringW(GetModuleHandleW(nullptr), 101, buffer, 64);
	buffer[63] = 0;
	wprintf_s(L"101:%ls\n", buffer);
	buffer[0] = 0;
	LoadStringW(GetModuleHandleW(nullptr), 102, buffer, 64);
	buffer[63] = 0;
	wprintf_s(L"102:%ls\n", buffer);
	buffer[0] = 0;
	LoadStringW(GetModuleHandleW(nullptr), 401, buffer, 64);
	buffer[63] = 0;
	wprintf_s(L"401:%ls\n", buffer);
	return 0;
}
