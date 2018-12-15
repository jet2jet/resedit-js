
#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <stdlib.h>
#include <wchar.h>

#include <pshpack1.h>
struct RESICONENTRY
{
	BYTE width;
	BYTE height;
	BYTE colors;
	BYTE reserved;
	WORD planes;
	WORD bitCount;
	DWORD dataSize;
	WORD iconID;
};

struct RESICONGROUP
{
	WORD reserved;
	WORD iconType;
	WORD iconCount;
	RESICONENTRY entries[1];
};
#include <poppack.h>

static HICON LoadIconFromExactId(HINSTANCE hInstance, int idIcon, int width, int height, UINT flags)
{
	auto hRes2 = FindResourceW(hInstance, MAKEINTRESOURCE(idIcon), RT_ICON);
	if (!hRes2)
	{
		return nullptr;
	}
	auto hg2 = LoadResource(hInstance, hRes2);
	auto pvIcon = static_cast<BYTE*>(LockResource(hg2));
	auto sizeIcon = SizeofResource(hInstance, hRes2);
	return CreateIconFromResourceEx(pvIcon, sizeIcon, TRUE, 0x00030000, width, height, flags);
}

int wmain()
{
	HINSTANCE hInstance = GetModuleHandleW(nullptr);
	auto hRes = FindResourceW(hInstance, MAKEINTRESOURCEW(101), RT_GROUP_ICON);
	if (!hRes)
	{
		return -1;
	}
	auto hg = LoadResource(hInstance, hRes);
	auto pvBlock = static_cast<RESICONGROUP*>(LockResource(hg));

	for (int i = 0; i < static_cast<int>(pvBlock->iconCount); ++i)
	{
		HICON hIcon = LoadIconFromExactId(hInstance, pvBlock->entries[i].iconID, 0, 0, LR_DEFAULTCOLOR);
		if (hIcon)
		{
			ICONINFO ii = { 0 };
			BITMAP bm = { 0 };
			GetIconInfo(hIcon, &ii);
			GetObjectW(ii.hbmColor, sizeof(bm), &bm);
			wprintf_s(L"%ldx%ld.isIcon:%s\n", bm.bmWidth, bm.bmHeight, ii.fIcon ? L"1" : L"0");
			wprintf_s(L"%ldx%ld.width:%ld\n", bm.bmWidth, bm.bmHeight, bm.bmWidth);
			wprintf_s(L"%ldx%ld.height:%ld\n", bm.bmWidth, bm.bmHeight, bm.bmHeight);
			wprintf_s(L"%ldx%ld.bitsPixel:%hu\n", bm.bmWidth, bm.bmHeight, bm.bmBitsPixel);
			DestroyIcon(hIcon);
		}
	}

	return 0;
}
