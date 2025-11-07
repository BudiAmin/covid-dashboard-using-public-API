import requests

url = "https://disease.sh/v3/covid-19/countries"
data = requests.get(url).json()

# Urutkan berdasarkan kasus dan ambil 10 teratas
top10 = sorted(data, key=lambda x: x["cases"], reverse=True)[:10]

for country in top10:
    print(f"{country['country']}: {country['cases']}")
