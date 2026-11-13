# Exercise dataset notice

`exercises.json` contains 1,324 exercise records (id, name, body part, equipment,
target muscle, secondary muscles, category and English instructions) that originate
from [ExerciseDB v1](https://exercisedb.dev/) by AscendAPI. They reached this project
through [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset),
via the [openGym](https://github.com/DuarteSantos8/openGym) catalogue (entries marked
`"textSource": "exercisedb"`), under the MIT licence reproduced below.

Only those MIT-licensed text fields are included. openGym's descriptions, translations,
newer catalogue entries and muscle-map data (AGPL-3.0) and its exercise media (proprietary,
Gym visual) are deliberately NOT included. Regenerate with `scripts/import-opengym.mjs`.

```
MIT License

Copyright (c) 2026 Hasan Emir Yıldırım

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation and data files (the "Software"),
to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
