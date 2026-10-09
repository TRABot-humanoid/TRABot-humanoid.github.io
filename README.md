# Talk, Render, Act (TRABot)

Project page for **Talk, Render, Act: Integrating Social Gesture and Digital Face with Synchronized Speech for Conversational Humanoid Robot**.

**[Project page](https://trabot-humanoid.github.io/)** · **[Paper (arXiv)](https://arxiv.org/abs/2610.06153)**

Jin Jiang, Kun Li, Jiancong Ma, Shengcai Liao  
United Arab Emirates University (UAEU)

TRABot is an agent-based framework that coordinates streaming speech, an
audio-driven digital face, and semantically planned body gestures on a Unitree
G1 humanoid in a single real-time interaction loop.

## Citation

```bibtex
@article{jiang2026trabot,
  title   = {Talk, Render, Act: Integrating Social Gesture and Digital Face
             with Synchronized Speech for Conversational Humanoid Robot},
  author  = {Jiang, Jin and Li, Kun and Ma, Jiancong and Liao, Shengcai},
  journal = {arXiv preprint arXiv:2610.06153},
  year    = {2026}
}
```

## Running the page locally

The site is static, with no build step.

```bash
python3 serve.py        # http://localhost:4173
```

`serve.py` is used instead of `python3 -m http.server` because the dialogue
player seeks inside the video clips, which needs HTTP Range support.
