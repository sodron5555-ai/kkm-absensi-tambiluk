# Model Face-API.js (WAJIB diunduh sebelum menjalankan aplikasi)

Folder ini harus berisi file model berikut agar deteksi & pengenalan wajah berfungsi:

- tiny_face_detector_model-weights_manifest.json
- tiny_face_detector_model-shard1
- face_landmark_68_model-weights_manifest.json
- face_landmark_68_model-shard1
- face_recognition_model-weights_manifest.json
- face_recognition_model-shard1
- face_recognition_model-shard2

## Cara mengunduh

Karena file model berbentuk binary dan berukuran besar, unduh langsung dari repo resmi
face-api.js (folder `weights`) di:

https://github.com/justadudewholikesai/face-api.js/tree/master/weights
(atau repo asli: https://github.com/vladmandic/face-api/tree/master/model)

Langkah tercepat lewat terminal (di komputer kamu, bukan di server Railway):

```bash
cd frontend/public/models
npx degit vladmandic/face-api/model .
```

Atau unduh manual satu per satu dari GitHub lalu taruh semua file tersebut langsung
di dalam folder `frontend/public/models/` ini (tanpa subfolder).

Setelah file model ada di sini, hapus file `BACA_INI.md` ini (opsional) dan jalankan
`npm run build` seperti biasa — model akan otomatis ikut ter-deploy karena berada di
folder `public`.
