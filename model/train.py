"""
Launch TF OD API training.
Run: python -m model.train
Training checkpoints saved to model/training/
Training takes ~15-30 min on RTX 3050 Ti.
"""
import subprocess
import sys
import os
from model.config import TRAINING_DIR, PIPELINE_CONFIG

# Locate the TF OD API train script inside the cloned tf_models repo
TRAIN_SCRIPT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "tf_models", "research", "object_detection", "model_main_tf2.py"
)

def train():
    os.makedirs(TRAINING_DIR, exist_ok=True)
    cmd = [
        sys.executable, TRAIN_SCRIPT,
        f"--model_dir={TRAINING_DIR}",
        f"--pipeline_config_path={PIPELINE_CONFIG}",
    ]
    print("Starting training... (this will take 15-30 minutes)")
    print(f"Command: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)

if __name__ == "__main__":
    train()
