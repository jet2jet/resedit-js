
#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <malloc.h>
#include <wchar.h>

#pragma comment(lib, "mincore.lib")
#pragma comment(lib, "version.lib")

static const WCHAR* s_VersionStringNames[] = {
	L"FileDescription",
	L"FileVersion",
	L"ProductName",
	L"ProductVersion",
	L"OriginalFilename"
};

static WCHAR* GetModuleFileNameAsString(HMODULE hModule)
{
	DWORD size = MAX_PATH;
	auto buff = static_cast<WCHAR*>(malloc(sizeof(WCHAR) * size));
	if (!buff)
		return nullptr;
	while (true)
	{
		auto dwRet = GetModuleFileNameW(hModule, buff, size);
		if (dwRet < size - 1)
		{
			break;
		}
		size += MAX_PATH;
		auto newBuff = static_cast<WCHAR*>(realloc(buff, sizeof(WCHAR) * size));
		if (!newBuff)
		{
			free(buff);
			return nullptr;
		}
		buff = newBuff;
	}
	return buff;
}

void OutputFixedVersionInfo(const void* pBlock)
{
	UINT len;
	VS_FIXEDFILEINFO* pData;
	if (VerQueryValueW(pBlock, L"\\", reinterpret_cast<void**>(&pData), &len) &&
		len >= sizeof(VS_VERSION_INFO))
	{
		wprintf_s(L"FileVersionMS:%lu\n", pData->dwFileVersionMS);
		wprintf_s(L"FileVersionLS:%lu\n", pData->dwFileVersionLS);
		wprintf_s(L"ProductVersionMS:%lu\n", pData->dwProductVersionMS);
		wprintf_s(L"ProductVersionLS:%lu\n", pData->dwProductVersionLS);
		wprintf_s(L"FileType:%lu\n", pData->dwFileType);
	}
}

void OutputStringVersionInfo(const void* pBlock)
{
	UINT len;
	DWORD* pdwTranslations;
	if (VerQueryValueW(pBlock, L"\\VarFileInfo\\Translation", reinterpret_cast<void**>(&pdwTranslations), &len) &&
		len >= sizeof(DWORD))
	{
		DWORD count = len / sizeof(DWORD);
		for (decltype(count) i = 0; i < count; ++i)
		{
			WCHAR varName[80];
			for (auto name : s_VersionStringNames)
			{
				WORD lang = LOWORD(pdwTranslations[i]);
				WORD cp = HIWORD(pdwTranslations[i]);
				swprintf_s(varName, L"\\StringFileInfo\\%04hx%04hx\\%ls",
					lang, cp, name);
				WCHAR* value;
				if (VerQueryValueW(pBlock, varName, reinterpret_cast<void**>(&value), &len))
				{
					wprintf_s(L"String.%hu-%hu.%ls:%.*ls\n", lang, cp, name, static_cast<int>(len), value);
				}
			}
		}
	}
}

int wmain()
{
	auto myPath = GetModuleFileNameAsString(GetModuleHandleW(nullptr));
	if (!myPath)
		return -1;
	DWORD dwHandle;
	auto size = GetFileVersionInfoSizeW(myPath, &dwHandle);
	if (!size)
	{
		free(myPath);
		return -1;
	}
	auto pBlock = malloc(size);
	auto r = GetFileVersionInfoW(myPath, dwHandle, size, pBlock);
	free(myPath);
	if (!r)
	{
		free(pBlock);
		return -1;
	}

	OutputFixedVersionInfo(pBlock);
	OutputStringVersionInfo(pBlock);

	free(pBlock);
	return 0;
}
