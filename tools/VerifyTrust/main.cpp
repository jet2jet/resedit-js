
#include <stdio.h>
#include <wchar.h>

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <softpub.h>
#include <wintrust.h>

#pragma comment(lib, "wintrust.lib")

int wmain(int argc, wchar_t* argv[])
{
	if (argc < 2)
	{
		_putws(L"Usage: VerifyTrust <executable-file>");
		return 1;
	}

	GUID               guidAction = WINTRUST_ACTION_GENERIC_VERIFY_V2;
	WINTRUST_DATA      trustData;
	WINTRUST_FILE_INFO fileInfo;

	fileInfo.cbStruct = sizeof(WINTRUST_FILE_INFO);
	fileInfo.hFile = NULL;
	fileInfo.pcwszFilePath = argv[1];
	fileInfo.pgKnownSubject = NULL;

	memset(&trustData, 0, sizeof(trustData));
	trustData.cbStruct = sizeof(WINTRUST_DATA);
	trustData.pPolicyCallbackData = NULL;
	trustData.pSIPClientData = NULL;
	trustData.dwUIChoice = WTD_UI_NONE;
	trustData.pFile = &fileInfo;
	trustData.fdwRevocationChecks = WTD_REVOKE_NONE;
	trustData.dwUnionChoice = WTD_CHOICE_FILE;
	trustData.dwStateAction = WTD_STATEACTION_IGNORE;
	trustData.hWVTStateData = NULL;
	trustData.pwszURLReference = NULL;
	trustData.dwProvFlags = 0;

	auto result = WinVerifyTrust((HWND)INVALID_HANDLE_VALUE, &guidAction, &trustData);
	wprintf_s(L"Result:%lu\n", static_cast<ULONG>(result));

	return 0;
}
