import sys
sys.path.insert(0, r'c:/society/fms/backend')
from units import urls
for url in urls.router.urls:
    print(url.name, url.pattern)
