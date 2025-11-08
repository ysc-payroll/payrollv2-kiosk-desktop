from PyInstaller.utils.hooks import collect_all

datas, binaries, hiddenimports = collect_all('PyQt6.QtWebEngineCore')

print('DATAS:')
for d in datas[:10]:
    print(f'  {d}')

print('\nBINARIES:')
for b in binaries[:10]:
    print(f'  {b}')

print('\nHIDDENIMPORTS:')
for h in hiddenimports[:10]:
    print(f'  {h}')
