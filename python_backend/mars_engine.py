# -*- coding: utf-8 -*-
"""
Mars (火星) 独立引擎 - 极限遗漏与旋转矩阵降维 (Covering Design) 算法核心模块
"""

import itertools
from typing import List, Dict, Any, Tuple, Set
import numpy as np
import pandas as pd


def calculate_ac_value(balls: List[int]) -> int:
    """计算算术复杂度 (AC值)"""
    sorted_balls = sorted(balls)
    diffs = set()
    for i in range(len(sorted_balls)):
        for j in range(i + 1, len(sorted_balls)):
            diffs.add(abs(sorted_balls[j] - sorted_balls[i]))
    return len(diffs) - (len(sorted_balls) - 1)


def calculate_odd_even(balls: List[int]) -> Tuple[int, int, str]:
    """计算奇偶比"""
    odd = sum(1 for b in balls if b % 2 != 0)
    even = len(balls) - odd
    return odd, even, f"{odd}:{even}"


def get_extreme_omission_mother_set(
    df_history: pd.DataFrame, 
    play_type: str = "ssq", 
    top_k: int = 12
) -> Tuple[List[int], List[Dict[str, Any]]]:
    """
    1. 极限遗漏选号：
    统计所有号码当前遗漏期数，选取偏离均值最大的 12 个号码作为“极冷复式母集”。
    """
    max_ball = 33 if play_type == "ssq" else 35
    omissions = {}

    for num in range(1, max_ball + 1):
        omissions[num] = 0
        found = False
        for _, row in df_history.iterrows():
            reds = [int(x) for x in row["reds"].split(",")]
            if num in reds:
                found = True
                break
            omissions[num] += 1
        if not found:
            omissions[num] = len(df_history)

    # 计算均值与标准差
    vals = list(omissions.values())
    mean_val = float(np.mean(vals))
    std_val = float(np.std(vals)) if float(np.std(vals)) > 0 else 1.0

    stats = []
    for num, om in omissions.items():
        z_score = (om - mean_val) / std_val
        stats.append({
            "number": num,
            "omission": om,
            "z_score": round(z_score, 3)
        })

    # 按照遗漏期数降序排列，取 Top 12 作为极冷复式母集
    stats.sort(key=lambda x: (x["omission"], x["z_score"]), reverse=True)
    mother_set = sorted([item["number"] for item in stats[:top_k]])
    return mother_set, stats[:top_k]


def covering_design_matrix(
    mother_set: List[int], 
    k: int = 6, 
    t: int = 5
) -> List[List[int]]:
    """
    2. 旋转矩阵降维 (Covering Design)：
    对 12 个号码的母集进行“中 6 保 5”（或中 5 保 4）的贪心集合覆盖矩阵压缩，
    将数百注全复式组合压缩到数十注。
    
    :param mother_set: 12个号码的母集
    :param k: 每注号码个数 (双色球为6，大乐透为5)
    :param t: 保证命中数 (双色球为5，大乐透为4)
    :return: 压缩后的票面列表
    """
    # 生成所有候选注: C(12, k)
    all_candidates = list(itertools.combinations(mother_set, k))
    
    # 需要覆盖的子组合: C(12, t)
    all_subsets = list(itertools.combinations(mother_set, t))
    uncovered: Set[Tuple[int, ...]] = set(all_subsets)
    
    # 建立候选注 -> 其能覆盖的 t 元子集
    coverage_map = {}
    for i, cand in enumerate(all_candidates):
        covered_t = set(itertools.combinations(cand, t))
        coverage_map[i] = covered_t
        
    chosen_indices: List[int] = []
    available = set(range(len(all_candidates)))
    
    # 贪心集合覆盖 (Greedy Set Cover)
    while uncovered and available:
        best_idx = -1
        max_covered = -1
        for idx in available:
            count = len(coverage_map[idx] & uncovered)
            if count > max_covered:
                max_covered = count
                best_idx = idx
        
        if best_idx == -1 or max_covered == 0:
            break
            
        chosen_indices.append(best_idx)
        available.remove(best_idx)
        uncovered -= coverage_map[best_idx]
        
    return [list(all_candidates[idx]) for idx in chosen_indices]


def apply_isomorphism_defense(
    tickets: List[List[int]], 
    play_type: str = "ssq"
) -> Tuple[List[List[int]], int]:
    """
    3. 同构形态防御：
    在输出最终矩阵票面之前，剔除全奇数、全偶数、所有号码和值在历史极值之外的无效票面。
    """
    k = 6 if play_type == "ssq" else 5
    sum_min = 58 if play_type == "ssq" else 48
    sum_max = 142 if play_type == "ssq" else 132
    
    valid_tickets: List[List[int]] = []
    filtered_count = 0
    
    for t in tickets:
        odd, even, _ = calculate_odd_even(t)
        # 剔除全奇数、全偶数
        if odd == k or even == k:
            filtered_count += 1
            continue
            
        # 剔除和值在历史极值之外的无效票面
        s = sum(t)
        if s < sum_min or s > sum_max:
            filtered_count += 1
            continue
            
        valid_tickets.append(t)
        
    return valid_tickets, filtered_count


def infer_blue_balls_distribution(
    df_history: pd.DataFrame, 
    play_type: str = "ssq"
) -> Tuple[List[List[int]], List[Dict[str, Any]]]:
    """
    根据历史数据推算蓝球/后区概率分布：
    结合一阶马尔可夫转移、遗漏期数与回补期望，杜绝简单的机械顺序(1, 2, 3, 4, 5, 6...)轮询或纯随机。
    """
    blue_max = 16 if play_type == "ssq" else 12
    history_blues = []
    for _, row in df_history.iterrows():
        b_list = [int(x.strip()) for x in str(row["blues"]).split(",") if x.strip()]
        history_blues.append(b_list)
    
    freqs = {b: 0 for b in range(1, blue_max + 1)}
    omissions = {b: -1 for b in range(1, blue_max + 1)}
    for idx, b_list in enumerate(history_blues):
        for b in b_list:
            if b in freqs:
                freqs[b] += 1
            if omissions[b] == -1:
                omissions[b] = idx
    for b in range(1, blue_max + 1):
        if omissions[b] == -1:
            omissions[b] = len(history_blues)
            
    baseline_blues = history_blues[0] if history_blues else ([1] if play_type == "ssq" else [1, 2])
    transitions = {b: 0.5 for b in range(1, blue_max + 1)}
    for i in range(len(history_blues) - 1):
        curr_b = history_blues[i]
        prev_b = history_blues[i + 1]
        for pb in prev_b:
            if pb in baseline_blues:
                for cb in curr_b:
                    if cb in transitions:
                        transitions[cb] += 1.0
                        
    tot_trans = sum(transitions.values())
    markov_probs = {b: transitions[b] / tot_trans for b in transitions}
    
    scores = {}
    for b in range(1, blue_max + 1):
        om = omissions[b]
        rebound = 1.35 if om >= 18 else (1.2 if om >= 14 else (1.15 if om <= 2 else 1.0))
        scores[b] = (0.5 * markov_probs[b] + 0.3 * (freqs[b] / max(1, len(history_blues)))) * rebound
        
    sorted_blues = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_blues = [b for b, _ in sorted_blues]
    
    if play_type == "ssq":
        candidate_combinations = [[b] for b, _ in sorted_blues]
    else:
        pair_candidates = []
        for b1 in range(1, blue_max + 1):
            for b2 in range(b1 + 1, blue_max + 1):
                span = b2 - b1
                span_w = 0.5 if span == 1 else (1.25 if 2 <= span <= 7 else 0.9)
                odd_c = (b1 % 2) + (b2 % 2)
                parity_w = 1.2 if odd_c == 1 else 0.85
                pair_score = (scores[b1] * scores[b2]) * span_w * parity_w
                pair_candidates.append(([b1, b2], pair_score))
        pair_candidates.sort(key=lambda x: x[1], reverse=True)
        candidate_combinations = [sorted(p) for p, _ in pair_candidates]
        
    return candidate_combinations, [{"number": b, "prob": round(markov_probs[b], 3), "omission": omissions[b]} for b in top_blues]


def generate_mars_tickets(
    df_history: pd.DataFrame, 
    play_type: str = "ssq",
    ticket_limit: int = 50
) -> Dict[str, Any]:
    """执行火星引擎全套降维量化流程"""
    k = 6 if play_type == "ssq" else 5
    t = 5 if play_type == "ssq" else 4
    
    # 步骤 1: 极限遗漏母集
    mother_set, mother_stats = get_extreme_omission_mother_set(df_history, play_type, 12)
    
    # 步骤 2: 旋转矩阵覆盖设计
    raw_tickets = covering_design_matrix(mother_set, k, t)
    raw_count = len(raw_tickets)
    
    # 步骤 3: 同构形态防御
    defended_tickets, filtered_count = apply_isomorphism_defense(raw_tickets, play_type)
    
    if ticket_limit and ticket_limit > 0:
        defended_tickets = defended_tickets[:ticket_limit]
        
    # 配赋基于历史数据推测的蓝球 / 后区 (依据转移矩阵及遗漏回补，杜绝 123456 机械顺序)
    blue_candidates, blue_stats = infer_blue_balls_distribution(df_history, play_type)
    
    final_tickets = []
    for idx, reds in enumerate(defended_tickets):
        blues = blue_candidates[idx % len(blue_candidates)]
            
        odd, even, ratio = calculate_odd_even(reds)
        ac = calculate_ac_value(reds)
        s = sum(reds)
        
        final_tickets.append({
            "id": f"MARS-{idx + 1}",
            "reds": reds,
            "blues": blues,
            "ac_value": ac,
            "odd_even_ratio": ratio,
            "sum_val": s,
            "banker_count": len(reds),
            "is_covering_ticket": True
        })
        
    theoretical = 924 if play_type == "ssq" else 792
    compression_ratio = f"{round((1 - len(final_tickets) / theoretical) * 100, 1)}%"
    cost_rmb = len(final_tickets) * 2
    
    return {
        "play_type": play_type,
        "engine": "mars",
        "history_used": len(df_history),
        "cold_mother_set": mother_set,
        "mother_set_omissions": mother_stats,
        "blue_inference_stats": blue_stats,
        "covering_design": {
            "rule": "中6保5" if play_type == "ssq" else "中5保4",
            "theoretical_combinations": theoretical,
            "raw_compressed_count": raw_count,
            "compressed_tickets_count": len(final_tickets),
            "compression_ratio": compression_ratio,
            "defense_filtered_count": filtered_count
        },
        "tickets": final_tickets,
        "cost_rmb": cost_rmb,
        "circuit_breaker_triggered": cost_rmb > 2000
    }
