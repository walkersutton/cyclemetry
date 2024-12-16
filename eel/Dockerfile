FROM python:3.11.9
WORKDIR /app

COPY . .
RUN pip install --no-cache-dir -r requirements.txt

CMD ["gunicorn", "--bind", "0.0.0.0:6969", "app:app"]