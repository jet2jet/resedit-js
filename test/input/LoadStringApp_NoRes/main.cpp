
#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <wchar.h>

int wmain()
{
	WCHAR buffer[64];
	LoadStringW(GetModuleHandleW(nullptr), 101, buffer, 64);
	buffer[63] = 0;
	wprintf_s(L"%ls\n", buffer);
	return 0;
}
